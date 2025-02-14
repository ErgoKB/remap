import { connect } from 'react-redux';
import Keycap from './Keycap';

import {
  KeymapActions,
  KeydiffActions,
  AppActions,
} from '../../../actions/actions';
import { Key } from '../keycodekey/KeyGen';
import { RootState } from '../../../store/state';

const mapStateToProps = (state: RootState) => {
  return {
    draggingKey: state.configure.keycodeKey.draggingKey,
    selectedLayer: state.configure.keymap.selectedLayer,
    testMatrix: state.configure.keymapToolbar.testMatrix,
    labelLang: state.app.labelLang,
  };
};
export type KeycapStateType = ReturnType<typeof mapStateToProps>;

const mapDispatchToProps = (_dispatch: any) => {
  return {
    onClickKeycap: (
      pos: string,
      isSelectedKey: boolean,
      orgKey: Key,
      dstKey: Key | null
    ) => {
      if (dstKey) {
        // show key diff
        _dispatch(KeydiffActions.updateKeydiff(orgKey.keymap, dstKey.keymap));
      } else if (!isSelectedKey) {
        // clear diff display
        _dispatch(KeydiffActions.clearKeydiff());
      }
      // set new selected Position and
      _dispatch(KeymapActions.updateSelectedPos(pos));
    },
    onDropKeycode: (
      draggingKey: Key,
      selectedLayer: number,
      pos: string,
      orgKey: Key
    ) => {
      if (draggingKey.keymap.code === orgKey.keymap.code) {
        return;
      }
      _dispatch(
        AppActions.remapsSetKey(selectedLayer, pos, draggingKey.keymap)
      );
    },
  };
};

export type KeycapActionsType = ReturnType<typeof mapDispatchToProps>;
export default connect(mapStateToProps, mapDispatchToProps)(Keycap);
