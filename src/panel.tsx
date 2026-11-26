import * as React from 'react';
import { useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { BBBScrollArea } from '@bigbluebutton/bbb-ui-components-react';
import Styled from './styles';
import { useCloseOnOutside, useDropUpPosition } from './useDropUpPosition';

interface DropUpPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

// The panel of the Templates button, drawn like the core "Media Sharing" drop-up.
function DropUpPanel({ title, onClose, children }: DropUpPanelProps): React.ReactElement {
  const panel = useRef<HTMLDivElement>(null);
  const { maxHeight, ...place } = useDropUpPosition();
  useCloseOnOutside(panel, onClose);

  return (
    <Styled.Panel ref={panel} style={{ ...place, maxHeight }} data-test="slideTemplatesPanel">
      <Styled.Header>
        <Styled.Title data-test="slideTemplatesTitle">{title}</Styled.Title>
        <IconButton size="small" aria-label="Close" data-test="slideTemplatesClose" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Styled.Header>
      <Styled.Content data-test="slideTemplatesScroll">
        <BBBScrollArea>
          <Styled.Grid>{children}</Styled.Grid>
        </BBBScrollArea>
      </Styled.Content>
    </Styled.Panel>
  );
}

interface PanelTileProps {
  dataTest: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function PanelTile({
  dataTest, label, disabled, onClick, children,
}: PanelTileProps): React.ReactElement {
  return (
    <Styled.Tile type="button" data-test={dataTest} aria-label={label} disabled={disabled} onClick={onClick}>
      <Styled.TileFrame>{children}</Styled.TileFrame>
      <Styled.TileLabel>{label}</Styled.TileLabel>
    </Styled.Tile>
  );
}

export default DropUpPanel;
