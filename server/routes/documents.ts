import { Router } from 'express';
import { db } from '../config/database';
import { documents, documentSections, documentBlocks } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

    // Organize blocks by section
    const sectionsWithBlocks = sections.map((section) => ({
      ...section,
      blocks: blocks.filter((block) => block.sectionId === section.id),
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
