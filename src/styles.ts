import styled from 'styled-components';
import {
  borderRadiusDefault, colorBrand1, colorGray, colorLightGray, colorNeutral3, colorNeutral4, colorWhite,
  spacingMedium, spacingSmall,
} from '@bigbluebutton/bbb-ui-components-react';

// The panel follows the core "Media Sharing" drop-up. Colors read the CSS variables of the core first, so a
// theme of the client applies, and fall back to the tokens of the BBB UI components library.
const surface = `var(--color-white-surface, ${colorWhite})`;
const outline = `var(--apps-gallery-outline, ${colorNeutral4})`;
const text = `var(--color-text, ${colorGray})`;
const tileBackground = `var(--color-gray-user-list-toolbar, ${colorLightGray})`;
const tileBorder = `var(--default-border, ${colorNeutral3})`;
const focusRing = `var(--btn-primary-bg, ${colorBrand1})`;

export const PANEL_WIDTH_REM = 26.25;

const Panel = styled.div`
  position: fixed;
  box-sizing: border-box;
  width: ${PANEL_WIDTH_REM}rem;
  display: flex;
  flex-direction: column;
  background: ${surface};
  border-radius: ${borderRadiusDefault};
  box-shadow: -4px 4px 8px 0px rgba(0, 0, 0, 0.25);
  color: ${text};
  font-family: 'Source Sans Pro', Arial, sans-serif;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: ${spacingMedium};
  border-bottom: 1px solid ${outline};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${text};
`;

// Takes the height the header leaves; the scroll area inside shrinks with it and scrolls.
const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;

  > div {
    flex: 1 1 auto;
    min-height: 0;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${spacingMedium};
  padding: ${spacingMedium};
  justify-items: center;
`;

// A tile is the whole button: the framed thumbnail and its label under it, as an option of Media Sharing.
const Tile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${spacingSmall};
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: ${text};
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:focus {
    outline: none;
  }
`;

const TileFrame = styled.div`
  box-sizing: border-box;
  padding: ${spacingSmall};
  border-radius: 16px;
  border: 1px solid ${tileBorder};
  background-color: ${tileBackground};
  transition: opacity 0.2s ease-in-out;

  ${Tile}:hover:not(:disabled) & {
    opacity: 0.8;
  }

  ${Tile}:focus-visible & {
    box-shadow: 0 0 0 2px ${focusRing};
  }
`;

const TileLabel = styled.div`
  width: 100%;
  text-align: center;
  line-height: 1;
`;

export default {
  Panel,
  Header,
  Title,
  Content,
  Grid,
  Tile,
  TileFrame,
  TileLabel,
};
