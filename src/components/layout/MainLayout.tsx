import { useState, useCallback } from 'react';
import { Header } from './Header';
import { SplitPanel } from './SplitPanel';
import { ChatPanel } from '../chat/ChatPanel';
import { DocumentEditor } from '../document/DocumentEditor';
import { PipelineStatusBar } from '../pipeline/PipelineStatusBar';
import { SessionSidebar } from '../sidebar/SessionSidebar';
import { useAppStore } from '../../store';

export function MainLayout() {
  const { ui, updateUI, toggleSidebar } = useAppStore();
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
        {/* Session Sidebar */}
        <SessionSidebar />

        {/* Toggle button when sidebar is closed */}
        {!ui.sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 w-8 flex items-center justify-center bg-surface border-r border-border hover:bg-background transition-colors"
            title="Open sidebar"
          >
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Main Content */}
        <div className="flex-1 h-full overflow-hidden">
          <SplitPanel
            left={<ChatPanel />}
            right={<DocumentEditor />}
            leftWidth={leftWidth}
            onWidthChange={handleWidthChange}
            minLeftWidth={25}
            maxLeftWidth={60}
          />
        </div>
      </div>
      <PipelineStatusBar />
    </div>
  );
}
