import { Router } from 'express';
import { db } from '../config/database';
import { documents, documentSections, documentBlocks } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { templateParser } from '../services/TemplateParser';
import type { CreateDocumentFromTemplateRequest } from '../types/template';

export const documentsRouter = Router();

// Get all documents
documentsRouter.get('/', async (req, res) => {
  try {
    const docs = await db()
      .select({
        id: documents.id,
        fileName: documents.fileName,
        version: documents.version,
        status: documents.status,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .orderBy(desc(documents.updatedAt));

    res.json(docs);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single document with sections and blocks
documentsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get document
    const [doc] = await db()
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get sections
    const sections = await db()
      .select()
      .from(documentSections)
      .where(eq(documentSections.documentId, id))
      .orderBy(documentSections.position);

    // Get blocks for all sections
    const blocks = await db()
      .select()
      .from(documentBlocks)
      .where(eq(documentBlocks.documentId, id))
      .orderBy(documentBlocks.position);

    // Organize blocks by section and map field names to frontend types
    const sectionsWithBlocks = sections.map((section) => ({
      id: section.id,
      type: section.sectionType,
      title: section.title,
      position: section.position,
      directives: section.directives,
      blocks: blocks
        .filter((block) => block.sectionId === section.id)
        .map((block) => ({
          id: block.id,
          type: block.blockType,
          content: block.content,
          position: block.position,
          entities: block.entities,
          relationships: block.relationships,
          wordCount: block.wordCount,
          createdBy: block.createdBy,
          updatedBy: block.updatedBy,
          createdAt: block.createdAt,
          updatedAt: block.updatedAt,
        })),
    }));

    res.json({
      ...doc,
      content: {
        sections: sectionsWithBlocks,
        order: sections.map((s) => s.id),
      },
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create document
documentsRouter.post('/', async (req, res) => {
  try {
    const { fileName, content, metadata } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    // Create document
    const [doc] = await db()
      .insert(documents)
      .values({
        fileName,
        content: content || {},
        metadata: metadata || {},
      })
      .returning();

    res.status(201).json(doc);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update document
documentsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, version, status, content, metadata } = req.body;

    const [updated] = await db()
      .update(documents)
      .set({
        ...(fileName && { fileName }),
        ...(version && { version }),
        ...(status && { status }),
        ...(content && { content }),
        ...(metadata && { metadata }),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete document
documentsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [deleted] = await db()
      .delete(documents)
      .where(eq(documents.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create section
documentsRouter.post('/:documentId/sections', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { sectionType, title, position } = req.body;

    const [section] = await db()
      .insert(documentSections)
      .values({
        documentId,
        sectionType,
        title,
        position: position || 0,
      })
      .returning();

    res.status(201).json(section);
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete section
documentsRouter.delete('/:documentId/sections/:sectionId', async (req, res) => {
  try {
    const { documentId, sectionId } = req.params;

    // Delete all blocks in this section first (cascade should handle this, but be explicit)
    await db()
      .delete(documentBlocks)
      .where(eq(documentBlocks.sectionId, sectionId));

    // Delete the section
    const [deleted] = await db()
      .delete(documentSections)
      .where(eq(documentSections.id, sectionId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ message: 'Section deleted' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update section position (reorder)
documentsRouter.patch('/:documentId/sections/:sectionId/position', async (req, res) => {
  try {
    const { documentId, sectionId } = req.params;
    const { newPosition } = req.body;

    if (typeof newPosition !== 'number' || newPosition < 0) {
      return res.status(400).json({ error: 'Valid newPosition is required' });
    }

    // Get all sections for this document ordered by position
    const sections = await db()
      .select()
      .from(documentSections)
      .where(eq(documentSections.documentId, documentId))
      .orderBy(documentSections.position);

    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (newPosition >= sections.length) {
      return res.status(400).json({ error: 'Invalid position' });
    }

    // Reorder: remove from current position and insert at new position
    const [movedSection] = sections.splice(currentIndex, 1);
    sections.splice(newPosition, 0, movedSection);

    // Update all positions in a batch
    for (let i = 0; i < sections.length; i++) {
      await db()
        .update(documentSections)
        .set({ position: i })
        .where(eq(documentSections.id, sections[i].id));
    }

    res.json({ message: 'Section moved successfully' });
  } catch (error) {
    console.error('Update section position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create block
documentsRouter.post('/:documentId/sections/:sectionId/blocks', async (req, res) => {
  try {
    const { documentId, sectionId } = req.params;
    const { blockType, content, position, createdBy } = req.body;

    // Calculate word count
    const text = JSON.stringify(content);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const [block] = await db()
      .insert(documentBlocks)
      .values({
        documentId,
        sectionId,
        blockType,
        content,
        position: position || 0,
        wordCount,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    res.status(201).json(block);
  } catch (error) {
    console.error('Create block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update block
documentsRouter.put('/blocks/:blockId', async (req, res) => {
  try {
    const { blockId } = req.params;
    const { content, updatedBy } = req.body;

    // Calculate word count
    const text = JSON.stringify(content);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const [updated] = await db()
      .update(documentBlocks)
      .set({
        content,
        wordCount,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(documentBlocks.id, blockId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete block
documentsRouter.delete('/blocks/:blockId', async (req, res) => {
  try {
    const { blockId } = req.params;

    const [deleted] = await db()
      .delete(documentBlocks)
      .where(eq(documentBlocks.id, blockId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ message: 'Block deleted' });
  } catch (error) {
    console.error('Delete block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update block position (reorder within section)
documentsRouter.patch('/blocks/:blockId/position', async (req, res) => {
  try {
    const { blockId } = req.params;
    const { newPosition } = req.body;

    if (typeof newPosition !== 'number' || newPosition < 0) {
      return res.status(400).json({ error: 'Valid newPosition is required' });
    }

    // Get the block to find its section
    const [block] = await db()
      .select()
      .from(documentBlocks)
      .where(eq(documentBlocks.id, blockId))
      .limit(1);

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Get all blocks in this section ordered by position
    const blocks = await db()
      .select()
      .from(documentBlocks)
      .where(eq(documentBlocks.sectionId, block.sectionId))
      .orderBy(documentBlocks.position);

    const currentIndex = blocks.findIndex((b) => b.id === blockId);
    if (currentIndex === -1) {
      return res.status(404).json({ error: 'Block not found in section' });
    }

    if (newPosition >= blocks.length) {
      return res.status(400).json({ error: 'Invalid position' });
    }

    // Reorder: remove from current position and insert at new position
    const [movedBlock] = blocks.splice(currentIndex, 1);
    blocks.splice(newPosition, 0, movedBlock);

    // Update all positions in a batch
    for (let i = 0; i < blocks.length; i++) {
      await db()
        .update(documentBlocks)
        .set({ position: i })
        .where(eq(documentBlocks.id, blocks[i].id));
    }

    res.json({ message: 'Block moved successfully' });
  } catch (error) {
    console.error('Update block position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Template Endpoints
// ============================================

// List available templates
documentsRouter.get('/templates/list', async (req, res) => {
  try {
    const templates = await templateParser.listTemplates();
    res.json(templates);
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get parsed template by ID (preview without creating document)
documentsRouter.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await templateParser.loadTemplate(templateId);
    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    if ((error as Error).message?.includes('not found')) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create document from template
documentsRouter.post('/from-template', async (req, res) => {
  try {
    const { templateId, documentName, initialMetadata } = req.body as CreateDocumentFromTemplateRequest;

    if (!templateId || !documentName) {
      return res.status(400).json({ error: 'templateId and documentName are required' });
    }

    // Load and parse template
    const template = await templateParser.loadTemplate(templateId);

    // Create document
    const [doc] = await db()
      .insert(documents)
      .values({
        fileName: documentName,
        version: template.metadata.version || '1.0.0',
        status: 'draft',
        content: {},
        metadata: {
          ...template.metadata,
          ...initialMetadata,
          sourceTemplate: templateId,
        },
      })
      .returning();

    // Create sections and blocks
    let totalBlocks = 0;

    for (const section of template.sections) {
      // Create section
      const [dbSection] = await db()
        .insert(documentSections)
        .values({
          documentId: doc.id,
          sectionType: section.type,
          title: section.title,
          position: section.position,
          directives: section.directives,
        })
        .returning();

      // Create blocks for this section
      for (const block of section.blocks) {
        const text = block.content.text || JSON.stringify(block.content);
        const wordCount = text.split(/\s+/).filter(Boolean).length;

        await db()
          .insert(documentBlocks)
          .values({
            documentId: doc.id,
            sectionId: dbSection.id,
            blockType: block.type,
            position: block.position,
            content: block.content,
            directives: block.directives,
            wordCount,
            createdBy: 'template',
            updatedBy: 'template',
          });

        totalBlocks++;
      }
    }

    res.status(201).json({
      documentId: doc.id,
      sectionCount: template.sections.length,
      blockCount: totalBlocks,
    });
  } catch (error) {
    console.error('Create from template error:', error);
    if ((error as Error).message?.includes('not found')) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
