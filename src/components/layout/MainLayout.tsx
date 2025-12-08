import { useState, useCallback } from 'react';
import { Header } from './Header';
import { SplitPanel } from './SplitPanel';
import { ChatPanel } from '../chat/ChatPanel';
import { DocumentEditor } from '../document/DocumentEditor';
import { PipelineStatusBar } from '../pipeline/PipelineStatusBar';
import { useAppStore } from '../../store';

export function MainLayout() {
  const { ui, updateUI } = useAppStore();
  const [leftWidth, setLeftWidth] = useState(ui.chatPanelWidth);

  const handleWidthChange = useCallback(
    (width: number) => {
      setLeftWidth(width);
      updateUI({ chatPanelWidth: width });
    },
    [updateUI]
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <SplitPanel
          left={<ChatPanel />}
          right={<DocumentEditor />}
          leftWidth={leftWidth}
          onWidthChange={handleWidthChange}
          minLeftWidth={25}
          maxLeftWidth={60}
        />
      </div>
      <PipelineStatusBar />
    </div>
  );
}
