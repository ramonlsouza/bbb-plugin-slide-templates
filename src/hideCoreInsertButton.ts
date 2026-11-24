import { useEffect } from 'react';

const STYLE_ID = 'slide-templates-hide-core-insert';

// Hides the core "+" of the presentation toolbar while the plugin is loaded, so the insert of pages is offered
// in one place. It relies on the data-test attribute of that button, not on a plugin API: if the core renames
// it, the "+" shows again. If the plugin does not load, the "+" stays.
export function useHideCoreInsertButton(): void {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return undefined;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '[data-test="insertPagesButton"] { display: none !important; }';
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);
}
