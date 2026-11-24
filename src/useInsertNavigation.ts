import { useEffect, useRef, useState } from 'react';
import { PluginApi } from 'bigbluebutton-html-plugin-sdk';

// Takes the presenter to the first page of an insert once it is in the presentation, as the core "+" does.
// The insert command of the SDK does not navigate, so the plugin watches the pages of the presentation and
// asks for the page change itself.

interface PageRow {
  pageId: string;
  num: number;
  isCurrentPage: boolean;
}

interface Pending {
  presentationId: string;
  knownIds: Set<string>;
  startPageId: string;
  startNum: number;
  timer: ReturnType<typeof setTimeout>;
}

// How long the plugin waits for the pages of an insert before giving up on the page change.
export const NAVIGATION_DEADLINE_MS = 60_000;

const PAGES_SUBSCRIPTION = `
  subscription SlideTemplatesPages($presentationId: String!) {
    pres_page(where: { presentationId: { _eq: $presentationId } }) {
      pageId
      num
      isCurrentPage
    }
  }
`;

const SET_PAGE_MUTATION = `
  mutation SlideTemplatesSetPage($presentationId: String!, $pageId: String!) {
    presentationSetPage(presentationId: $presentationId, pageId: $pageId)
  }
`;

export interface InsertNavigation {
  // Registers the insert about to be asked for, right after the current page. Call it before the command.
  begin: () => void;
  // True from begin until the pages arrive, the presenter moves away, or the deadline passes.
  pending: boolean;
}

export function useInsertNavigation(
  pluginApi: PluginApi,
  presentationId: string | undefined,
  presenter: boolean,
): InsertNavigation {
  const { data } = pluginApi.useCustomSubscription<{ pres_page: PageRow[] }>(PAGES_SUBSCRIPTION, {
    variables: { presentationId: presentationId || '' },
  });
  const [setPage] = pluginApi.useCustomMutation<{ presentationId: string; pageId: string }>(SET_PAGE_MUTATION);
  const pendingRef = useRef<Pending | null>(null);
  const [pending, setPending] = useState(false);
  const pages = data?.pres_page;

  const clear = () => {
    if (pendingRef.current) clearTimeout(pendingRef.current.timer);
    pendingRef.current = null;
    setPending(false);
  };

  const begin = () => {
    const current = pages?.find((p) => p.isCurrentPage);
    if (!presentationId || !pages || !current) return;
    if (pendingRef.current) clearTimeout(pendingRef.current.timer);
    pendingRef.current = {
      presentationId,
      knownIds: new Set(pages.map((p) => p.pageId)),
      startPageId: current.pageId,
      startNum: current.num,
      timer: setTimeout(() => {
        console.log('[slide-templates] the inserted page did not arrive in time; no page change');
        clear();
      }, NAVIGATION_DEADLINE_MS),
    };
    setPending(true);
  };

  useEffect(() => {
    const p = pendingRef.current;
    if (!p || !pages) return;
    const current = pages.find((x) => x.isCurrentPage);
    // The presenter moved to another page (or presentation) while waiting: never pull them back.
    if (presentationId !== p.presentationId || (current && current.pageId !== p.startPageId)) {
      console.log('[slide-templates] the presenter moved away; no page change');
      clear();
      return;
    }
    const arrived = pages.find((x) => !p.knownIds.has(x.pageId) && x.num === p.startNum + 1);
    if (!arrived) return;
    clear();
    if (presenter && setPage) {
      setPage({ variables: { presentationId: p.presentationId, pageId: arrived.pageId } });
    }
  }, [pages, presentationId, presenter]);

  useEffect(() => () => {
    if (pendingRef.current) clearTimeout(pendingRef.current.timer);
  }, []);

  return { begin, pending };
}
