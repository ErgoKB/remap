import './KeyboardList.scss';
import React from 'react';
import {
  KeyboardListActionsType,
  KeyboardListStateType,
} from './KeyboardList.container';
import {
  IKeyboardDefinitionDocument,
  IKeyboardDefinitionStatus,
  KeyboardDefinitionStatus,
} from '../../../services/storage/Storage';
import { Button, Card, CardContent, Chip, Typography } from '@material-ui/core';
import { hexadecimal } from '../../../utils/StringUtils';
import moment from 'moment-timezone';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import { KeyboardsPhase } from '../../../store/state';

type KeyboardListState = {};
type OwnProps = {};
type KeyboardListProps = OwnProps &
  Partial<KeyboardListActionsType> &
  Partial<KeyboardListStateType>;

export default class KeyboardList extends React.Component<
  KeyboardListProps,
  KeyboardListState
> {
  constructor(props: KeyboardListProps | Readonly<KeyboardListProps>) {
    super(props);
  }

  handleCreateButtonClick = () => {
    this.props.createKeyboard!();
  };

  render() {
    return (
      <div className="keyboard-list-wrapper">
        <div className="keyboard-list">
          {this.props.keyboardDefinitionDocuments!.map((doc, index) => (
            <div key={index} className="keyboard">
              <Keyboard doc={doc} />
            </div>
          ))}
        </div>
        <div className="keyboard-list-buttons">
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleCreateButtonClick}
          >
            +Keyboard
          </Button>
        </div>
      </div>
    );
  }
}

type KeyboardProps = {
  doc: IKeyboardDefinitionDocument;
};

function Keyboard(props: KeyboardProps) {
  const renderStatusBadge = (status: IKeyboardDefinitionStatus) => {
    switch (status) {
      case KeyboardDefinitionStatus.draft:
      case KeyboardDefinitionStatus.in_review:
        return <Chip label={props.doc.status} size="small" />;
      case KeyboardDefinitionStatus.rejected:
        return <Chip label={props.doc.status} size="small" color="secondary" />;
      case KeyboardDefinitionStatus.approved:
        return <Chip label={props.doc.status} size="small" color="primary" />;
      default:
        throw new Error(`Unknown Status: ${status}`);
    }
  };
  return (
    <Card>
      <CardContent>
        <div className="keyboard-container">
          <div className="keyboard-container-left">
            <div className="keyboard-header">
              <h2 className="keyboard-name">{props.doc.name}</h2>
              {renderStatusBadge(props.doc.status)}
            </div>
            <div className="keyboard-meta">
              <div className="keyboard-meta-info">
                <span className="keyboard-meta-info-label">Vendor ID:</span>
                {hexadecimal(props.doc.vendorId, 4)}
              </div>
              <div className="keyboard-meta-info">
                <span className="keyboard-meta-info-label">Product ID:</span>
                {hexadecimal(props.doc.productId, 4)}
              </div>
              <div className="keyboard-meta-info">
                <span className="keyboard-meta-info-label">Product Name:</span>
                {props.doc.productName}
              </div>
            </div>
            <div className="keyboard-meta">
              <div className="keyboard-meta-info">
                <span className="keyboard-meta-info-label">Created at:</span>
                {moment(props.doc.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
              <div className="keyboard-meta-info">
                <span className="keyboard-meta-info-label">Updated at: </span>
                {moment(props.doc.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>
          </div>
          <div className="keyboard-container-right">
            <Button color="primary">
              <ArrowDownwardIcon />
              JSON
            </Button>
            <Button color="primary">Detail</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
