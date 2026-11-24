import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import SlideTemplatesPlugin from './component';

const uuid = document.currentScript?.getAttribute('uuid') || 'root';
const root = ReactDOM.createRoot(document.getElementById(uuid));
root.render(<SlideTemplatesPlugin pluginUuid={uuid} />);
