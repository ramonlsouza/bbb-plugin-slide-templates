import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BbbPluginSdk, FloatingWindow, PresentationToolbarButton } from 'bigbluebutton-html-plugin-sdk';
import { TEMPLATES, SlideTemplate } from './templates';
import { pdfBytes } from './pdf';
import Thumbnail, { BlankThumbnail, FileThumbnail } from './thumbnail';
import { useInsertNavigation } from './useInsertNavigation';
import { useHideCoreInsertButton } from './hideCoreInsertButton';

interface CurrentPageSize {
  pres_page_curr: { width: number; height: number; num: number }[];
}

// Used when the size of the current page cannot be read.
const DEFAULT_SIZE = { width: 1600, height: 900 };

// The file types the core accepts for an insert: the upload types that are not images.
const acceptedFileTypes = (): string => {
  const types: { extension: string; mime: string }[] | undefined = (window as unknown as {
    meetingClientSettings?: { public?: { presentation?: { uploadValidMimeTypes?: { extension: string; mime: string }[] } } };
  }).meetingClientSettings?.public?.presentation?.uploadValidMimeTypes;
  const accepted = (types || []).filter((t) => !t.mime.startsWith('image/')).map((t) => t.extension);
  return accepted.length ? accepted.join(',') : '.pdf';
};

const tileStyle = (disabled: boolean): React.CSSProperties => ({
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: 6,
  background: '#f7f7f7',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

function SlideTemplatesPlugin({ pluginUuid }: { pluginUuid: string }): React.ReactElement {
  BbbPluginSdk.initialize(pluginUuid);
  const pluginApi = BbbPluginSdk.getPluginApi(pluginUuid);
  const [open, setOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: currentUser } = pluginApi.useCurrentUser();
  const { data: currentPresentation } = pluginApi.useCurrentPresentation();
  const { data: pageData, error: pageError } = pluginApi.useCustomSubscription<CurrentPageSize>(`
    subscription SlideTemplatesCurrentPage {
      pres_page_curr { width height num }
    }
  `);

  const presenter = !!currentUser?.presenter;
  const presentationId = currentPresentation?.presentationId;
  const pageNum = currentPresentation?.currentPage?.num;
  const page = pageData?.pres_page_curr?.[0];
  const size = page?.width > 0 && page?.height > 0
    ? { width: Math.round(page.width), height: Math.round(page.height) } : DEFAULT_SIZE;
  const navigation = useInsertNavigation(pluginApi, presentationId, presenter);
  const { pending } = navigation;

  useHideCoreInsertButton();

  useEffect(() => {
    if (pageError) console.warn('[slide-templates] page size not available, using 1600x900', pageError);
  }, [pageError]);

  const { insertPages } = pluginApi.serverCommands.presentation;

  // Blank page and templates: register the insert, ask for it right after the current slide, close the panel.
  const insertBlank = () => {
    if (!pageNum || pending) return;
    navigation.begin();
    insertPages(pageNum + 1);
    setOpen(false);
  };

  const insertTemplate = (template: SlideTemplate) => {
    if (!pageNum || pending) return;
    const bytes = pdfBytes(size.width, size.height, template.draw(size.width, size.height));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    navigation.begin();
    insertPages(pageNum + 1, { blob }, 'application/pdf', `${template.label}.pdf`);
    setOpen(false);
  };

  // A file: the panel stays open while the file chooser is shown; the insert starts when a file is chosen.
  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pageNum) return;
    navigation.begin();
    insertPages(pageNum + 1, { file }, file.type || 'application/pdf', file.name);
    // eslint-disable-next-line no-param-reassign
    event.target.value = '';
    setOpen(false);
  };

  useEffect(() => {
    pluginApi.setPresentationToolbarItems(presenter ? [
      new PresentationToolbarButton({
        label: 'Templates',
        tooltip: 'Insert a page after the current slide',
        dataTest: 'slideTemplatesButton',
        onClick: () => setOpen((o) => !o),
      }),
    ] : []);
  }, [presenter]);

  useEffect(() => {
    if (!presenter || !open) {
      pluginApi.setFloatingWindows([]);
      return;
    }
    pluginApi.setFloatingWindows([
      new FloatingWindow({
        top: 80,
        left: 420,
        movable: true,
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        zIndex: 1000,
        dataTest: 'slideTemplatesWindow',
        contentFunction: (element: HTMLElement) => {
          const root = ReactDOM.createRoot(element);
          root.render(
            <div style={{ padding: 12, fontFamily: 'Source Sans Pro, Arial, sans-serif', color: '#222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong data-test="slideTemplatesTitle">
                  {pending ? 'Inserting...' : `Insert a page after slide ${pageNum}`}
                </strong>
                <button type="button" aria-label="Close" data-test="slideTemplatesClose" onClick={() => setOpen(false)}>x</button>
              </div>
              <div
                data-test="slideTemplatesScroll"
                style={{
                  maxHeight: 'calc(100vh - 160px)', overflowY: 'auto',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 12 }}>
                  <button
                    type="button"
                    data-test="slideTemplate-blank"
                    aria-label="Blank page"
                    disabled={pending}
                    onClick={insertBlank}
                    style={tileStyle(pending)}
                  >
                    <BlankThumbnail width={size.width} height={size.height} />
                    <div style={{ marginTop: 4, fontSize: 13 }}>Blank page</div>
                  </button>
                  <button
                    type="button"
                    data-test="slideTemplate-file"
                    aria-label="From a file..."
                    disabled={pending}
                    onClick={() => fileInput.current?.click()}
                    style={tileStyle(pending)}
                  >
                    <FileThumbnail width={size.width} height={size.height} />
                    <div style={{ marginTop: 4, fontSize: 13 }}>From a file...</div>
                  </button>
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      data-test={`slideTemplate-${t.id}`}
                      aria-label={t.label}
                      disabled={pending}
                      onClick={() => insertTemplate(t)}
                      style={tileStyle(pending)}
                    >
                      <Thumbnail template={t} width={size.width} height={size.height} />
                      <div style={{ marginTop: 4, fontSize: 13 }}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>,
          );
          return root;
        },
      }),
    ]);
  }, [presenter, open, pageNum, size.width, size.height, pending]);

  // The file input lives in the plugin's own root, not in the panel, so a re-render of the panel while the
  // file chooser is open cannot drop the chosen file.
  return (
    <input
      ref={fileInput}
      type="file"
      accept={acceptedFileTypes()}
      onChange={onFileChosen}
      data-test="slideTemplatesFileInput"
      style={{ display: 'none' }}
      tabIndex={-1}
      aria-hidden
    />
  );
}

export default SlideTemplatesPlugin;
