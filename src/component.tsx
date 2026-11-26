import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BbbPluginSdk, FloatingWindow, PresentationToolbarButton } from 'bigbluebutton-html-plugin-sdk';
import { TEMPLATES, SlideTemplate } from './templates';
import { pdfBytes } from './pdf';
import Thumbnail, { BlankThumbnail, FileThumbnail } from './thumbnail';
import { useInsertNavigation } from './useInsertNavigation';
import { useHideCoreInsertButton } from './hideCoreInsertButton';
import DropUpPanel, { PanelTile } from './panel';

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

function SlideTemplatesPlugin({ pluginUuid }: { pluginUuid: string }): React.ReactElement {
  BbbPluginSdk.initialize(pluginUuid);
  const pluginApi = BbbPluginSdk.getPluginApi(pluginUuid);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
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
        // Not movable: the panel is a drop-up of the Templates button and places itself (see useDropUpPosition).
        top: 0,
        left: 0,
        movable: false,
        backgroundColor: 'transparent',
        boxShadow: 'none',
        zIndex: 1000,
        dataTest: 'slideTemplatesWindow',
        contentFunction: (element: HTMLElement) => {
          const root = ReactDOM.createRoot(element);
          root.render(
            <DropUpPanel
              title={pending ? 'Inserting...' : `Insert a page after slide ${pageNum}`}
              onClose={close}
            >
              <PanelTile dataTest="slideTemplate-blank" label="Blank page" disabled={pending} onClick={insertBlank}>
                <BlankThumbnail width={size.width} height={size.height} />
              </PanelTile>
              <PanelTile
                dataTest="slideTemplate-file"
                label="From a file..."
                disabled={pending}
                onClick={() => fileInput.current?.click()}
              >
                <FileThumbnail width={size.width} height={size.height} />
              </PanelTile>
              {TEMPLATES.map((t) => (
                <PanelTile
                  key={t.id}
                  dataTest={`slideTemplate-${t.id}`}
                  label={t.label}
                  disabled={pending}
                  onClick={() => insertTemplate(t)}
                >
                  <Thumbnail template={t} width={size.width} height={size.height} />
                </PanelTile>
              ))}
            </DropUpPanel>,
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
