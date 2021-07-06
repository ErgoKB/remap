/* eslint-disable no-undef */
import React from 'react';
import './KeymapToolbar.scss';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import ClearAllRoundedIcon from '@mui/icons-material/ClearAllRounded';
import FlareRoundedIcon from '@mui/icons-material/FlareRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import ViewQuiltRoundedIcon from '@mui/icons-material/ViewQuiltRounded';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  KeymapMenuActionsType,
  KeymapMenuStateType,
} from './KeymapToolbar.container';
import { IKeymap } from '../../../services/hid/Hid';
import { genKey, Key } from '../keycodekey/KeyGen';
import { KeymapPdfGenerator } from '../../../services/pdf/KeymapPdfGenerator';
import LightingDialog from '../lighting/LightingDialog';
import LayoutOptionPopover from '../layoutoption/LayoutOptionPopover.container';
import { ImportFileIcon } from '../../common/icons/ImportFileIcon';
import ImportDefDialog from '../importDef/ImportDefDialog.container';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import InputIcon from '@mui/icons-material/Input';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import { sendEventToGoogleAnalytics } from '../../../utils/GoogleAnalytics';
import { Restore as RestoreIcon } from '@mui/icons-material';
import { KeycodeList } from '../../../services/hid/KeycodeList';

type OwnProp = {};

type KeymapExported = {
  name: string;
  vendorId: number;
  productId: number;
  keycodes: { [pos: string]: number }[];
};

type KeymapMenuPropsType = OwnProp &
  Partial<KeymapMenuStateType> &
  Partial<KeymapMenuActionsType>;

type OwnKeymapMenuStateType = {
  openLightingDialog: boolean;
  layoutOptionPopoverPosition: { left: number; top: number } | null;
  keymapListPopoverPosition: { left: number; top: number } | null;
  openImportDefDialog: boolean;
  subMenuAnchorEl: (EventTarget & Element) | null;
  openConfirmDialog: boolean;
};

export default class KeymapMenu extends React.Component<
  KeymapMenuPropsType,
  OwnKeymapMenuStateType
> {
  constructor(props: KeymapMenuPropsType | Readonly<KeymapMenuPropsType>) {
    super(props);
    this.state = {
      openLightingDialog: false,
      layoutOptionPopoverPosition: null,
      keymapListPopoverPosition: null,
      openImportDefDialog: false,
      subMenuAnchorEl: null,
      openConfirmDialog: false,
    };
  }

  get hasChanges(): boolean {
    for (let i = 0; i < this.props.remaps!.length; i++) {
      const remap: { [pos: string]: IKeymap } = this.props.remaps![i];
      const item = Object.values(remap).find(
        (value) => typeof value === 'object' && typeof value.code === 'number'
      );
      if (item != undefined) return true;
    }

    return false;
  }

  private onClickClearAllChanges() {
    sendEventToGoogleAnalytics('configure/clear_all_changes', {
      vendor_id: this.props.keyboard!.getInformation().vendorId,
      product_id: this.props.keyboard!.getInformation().productId,
      product_name: this.props.keyboard!.getInformation().productName,
    });
    this.props.clearAllRemaps!(this.props.layerCount!);
  }

  private onClickOpenLayoutOptionPopover(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    const { left, top } = event.currentTarget.getBoundingClientRect();
    this.setState({
      layoutOptionPopoverPosition: {
        left,
        top,
      },
    });
  }

  private onCloseLayoutOptionPopover() {
    this.setState({ layoutOptionPopoverPosition: null });
  }

  private onClickOpenImportDefFileDialog() {
    this.setState({ subMenuAnchorEl: null, openImportDefDialog: true });
  }

  private onCloseImportDefFileDialog() {
    this.setState({ openImportDefDialog: false });
  }

  private onClickGetCheatsheet() {
    const keymaps: { [pos: string]: IKeymap }[] = this.props.keymaps!;
    const keys: { [pos: string]: Key }[] = [];
    for (let i = 0; i < this.props.layerCount!; i++) {
      const keyMap: { [pos: string]: Key } = {};
      const km = keymaps[i];
      Object.keys(km).forEach((pos) => {
        const key: Key = genKey(km[pos], this.props.labelLang!);
        keyMap[pos] = key;
      });
      keys.push(keyMap);
    }

    const { productName } = this.props.keyboard!.getInformation();
    const pdf = new KeymapPdfGenerator(
      this.props.keyboardDefinition!.layouts.keymap,
      keys,
      this.props.layerCount!,
      this.props.labelLang!
    );

    sendEventToGoogleAnalytics('configure/cheat_sheet', {
      vendor_id: this.props.keyboard!.getInformation().vendorId,
      product_id: this.props.keyboard!.getInformation().productId,
      product_name: this.props.keyboard!.getInformation().productName,
    });

    pdf.genPdf(productName, this.props.selectedKeyboardOptions!).catch((e) => {
      console.error(e);
      const msg = `Couldn't generate the PDF. Please check your keyboard and definition file(.json).`;
      this.props.error!(msg);
    });
  }

  private onClickOpenKeymapListPopover(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    const { left, top } = event.currentTarget.getBoundingClientRect();
    this.setState({
      keymapListPopoverPosition: {
        left,
        top,
      },
    });
  }

  private onCloseKeymapListPopover() {
    this.setState({ keymapListPopoverPosition: null });
  }

  private onLightingClick() {
    sendEventToGoogleAnalytics('configure/lighting', {
      vendor_id: this.props.keyboard!.getInformation().vendorId,
      product_id: this.props.keyboard!.getInformation().productId,
      product_name: this.props.keyboard!.getInformation().productName,
    });

    this.setState({ openLightingDialog: true });
  }

  private onClickSubMenu(event: React.MouseEvent) {
    const elem = event.currentTarget;
    this.setState({
      subMenuAnchorEl: elem,
    });
  }

  private onCloseSubmenu() {
    this.setState({ subMenuAnchorEl: null });
  }

  private onClickTestMatrixMode() {
    this.onCloseSubmenu();
    this.props.updateTestMatrixOn!();
  }

  private onClickConfirmDialogYes() {
    this.setState({ openConfirmDialog: false });
    this.props.resetKeymap!();
  }

  private onClickConfirmDialogNo() {
    this.setState({ openConfirmDialog: false });
  }

  private onClickResetKeymap() {
    this.setState({ subMenuAnchorEl: null, openConfirmDialog: true });
  }

  private importKeymap() {
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = '.json';
    upload.addEventListener('change', () => {
      if (!upload.files || upload.files.length === 0) {
        return;
      }
      const fileName = upload.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        const keymapText = e.target?.result || '';
        if (keymapText === '') {
          this.props.error!('Can not open file');
          return;
        }
        const keymapImported: KeymapExported = JSON.parse(
          keymapText.toString()
        );
        if (
          keymapImported.name !== this.props.keyboardDefinition?.name ||
          keymapImported.vendorId !==
            parseInt(this.props.keyboardDefinition?.vendorId || '0') ||
          keymapImported.productId !==
            parseInt(this.props.keyboardDefinition?.productId || '0')
        ) {
          this.props.error!('This keymap is not for your keyboard');
          return;
        }
        let keycodes: { [pos: string]: IKeymap }[] = [];
        const savedKeycodes: { [pos: string]: number }[] =
          keymapImported.keycodes;
        const keymaps: { [pos: string]: IKeymap }[] = this.props.keymaps!;
        for (let i = 0; i < keymaps.length; i++) {
          const keymap = keymaps[i];
          const savedCode = savedKeycodes[i];
          const changes: { [pos: string]: IKeymap } = {};
          if (i < savedKeycodes.length) {
            Object.keys(keymap).forEach((pos) => {
              if (keymap[pos].code != savedCode[pos]) {
                changes[pos] = KeycodeList.getKeymap(
                  savedCode[pos],
                  'en-us',
                  undefined
                );
              }
            });
          }
          keycodes.push(changes);
        }
        this.props.applySavedKeymapData!(keycodes);
      };
      reader.readAsText(fileName);
    });
    upload.click();
  }

  private exportKeymap() {
    const keymaps: { [pos: string]: IKeymap }[] = this.props.keymaps!;
    const keycodes: { [pos: string]: number }[] = [];
    for (let i = 0; i < keymaps.length; i++) {
      const keyMap: { [pos: string]: number } = {};
      const km = keymaps[i];
      Object.keys(km).forEach((pos) => {
        keyMap[pos] = km[pos].code;
      });
      keycodes.push(keyMap);
    }

    const keyboardName = this.props.keyboardDefinition?.name || 'unknown';
    const vendorId = parseInt(this.props.keyboardDefinition?.vendorId || '0');
    const productId = parseInt(this.props.keyboardDefinition?.productId || '0');
    const keymapExported: KeymapExported = {
      name: keyboardName,
      vendorId,
      productId,
      keycodes,
    };
    const json = JSON.stringify(keymapExported);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${keyboardName}-keymap.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  render() {
    const isLightingAvailable = LightingDialog.isLightingAvailable(
      this.props.keyboardDefinition!.lighting
    );
    const hasLayoutOptions = 0 < this.props.selectedKeyboardOptions!.length;
    const { vendorId, productId, productName } =
      this.props.keyboard!.getInformation();
    return (
      <React.Fragment>
        <div className="keymap-menu">
          <div className="keymap-menu-item">
            <Tooltip arrow={true} placement="top" title="Clear all changes">
              <span>
                <IconButton
                  disabled={!this.hasChanges}
                  size="small"
                  onClick={this.onClickClearAllChanges.bind(this)}
                >
                  <ClearAllRoundedIcon
                    color={this.hasChanges ? undefined : 'disabled'}
                  />
                </IconButton>
              </span>
            </Tooltip>
          </div>

          {isLightingAvailable && (
            <div className="keymap-menu-item">
              <Tooltip arrow={true} placement="top" title="Lighting">
                <IconButton
                  size="small"
                  onClick={() => {
                    this.onLightingClick();
                  }}
                >
                  <FlareRoundedIcon />
                </IconButton>
              </Tooltip>
            </div>
          )}

          {hasLayoutOptions && (
            <div className="keymap-menu-item">
              <Tooltip arrow={true} placement="top" title="Layout Option">
                <IconButton
                  size="small"
                  onClick={(event) => {
                    this.onClickOpenLayoutOptionPopover(event);
                  }}
                >
                  <ViewQuiltRoundedIcon />
                </IconButton>
              </Tooltip>
              <LayoutOptionPopover
                open={Boolean(this.state.layoutOptionPopoverPosition)}
                onClose={() => {
                  this.onCloseLayoutOptionPopover();
                }}
                position={this.state.layoutOptionPopoverPosition}
                hidSupport={true}
              />
            </div>
          )}

          <div className="keymap-menu-item">
            <Tooltip arrow={true} placement="top" title="import keymap">
              <IconButton size="small" onClick={() => this.importKeymap()}>
                <InputIcon />
              </IconButton>
            </Tooltip>
          </div>

          <div className="keymap-menu-item">
            <Tooltip arrow={true} placement="top" title="export keymap">
              <IconButton size="small" onClick={() => this.exportKeymap()}>
                <ImportExportIcon />
              </IconButton>
            </Tooltip>
          </div>

          <div className="keymap-menu-item">
            <Tooltip
              arrow={true}
              placement="top"
              title="Get keymap cheat sheet (PDF)"
            >
              <IconButton
                size="small"
                onClick={this.onClickGetCheatsheet.bind(this)}
              >
                <PictureAsPdfRoundedIcon />
              </IconButton>
            </Tooltip>
          </div>

          <div className="keymap-menu-item">
            <IconButton size="small" onClick={this.onClickSubMenu.bind(this)}>
              <MoreHorizIcon />
            </IconButton>
            <Menu
              anchorEl={this.state.subMenuAnchorEl}
              open={Boolean(this.state.subMenuAnchorEl)}
              onClose={this.onCloseSubmenu.bind(this)}
              className="keymap-menu-item-submenu"
            >
              <MenuItem
                onClick={this.onClickOpenImportDefFileDialog.bind(this)}
              >
                <ListItemIcon>
                  <ImportFileIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Import keyboard definition file" />
              </MenuItem>

              <MenuItem onClick={this.onClickTestMatrixMode.bind(this)}>
                <ListItemIcon>
                  <ViewComfyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Test Matrix mode" />
              </MenuItem>

              <MenuItem onClick={this.onClickResetKeymap.bind(this)}>
                <ListItemIcon>
                  <RestoreIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Reset Keymap" />
              </MenuItem>
            </Menu>
          </div>
        </div>
        <LightingDialog
          open={this.state.openLightingDialog}
          keyboard={this.props.keyboard!}
          lightingDef={this.props.keyboardDefinition!.lighting}
          onClose={() => {
            this.setState({ openLightingDialog: false });
          }}
        />
        <ImportDefDialog
          open={this.state.openImportDefDialog}
          onClose={this.onCloseImportDefFileDialog.bind(this)}
          vendorId={vendorId}
          productId={productId}
          productName={productName}
        />
        <ConfirmDialog
          open={this.state.openConfirmDialog}
          onNoClick={this.onClickConfirmDialogNo.bind(this)}
          onYesClick={this.onClickConfirmDialogYes.bind(this)}
        />
      </React.Fragment>
    );
  }
}

type IConfirmDialogProps = {
  open: boolean;
  onYesClick: () => void;
  onNoClick: () => void;
};

function ConfirmDialog(props: IConfirmDialogProps) {
  return (
    <Dialog
      open={props.open}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">
        Are you sure to reset keymap?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description" color="secondary">
          Current keymap will be discarded and an initial keymap will be applied
          immediately. If you want to reuse current keymap, please save it
          before resetting.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          autoFocus
          onClick={() => {
            props.onNoClick();
          }}
        >
          No
        </Button>
        <Button
          color="secondary"
          onClick={() => {
            props.onYesClick();
          }}
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
