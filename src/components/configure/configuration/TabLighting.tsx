/* eslint-disable no-undef */
import React from 'react';
import './TabLighting.scss';
import '../../../../node_modules/reinvented-color-wheel/css/reinvented-color-wheel.min.css';
import {
  Grid,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
} from '@material-ui/core';
import ReinventedColorWheel from 'reinvented-color-wheel';
import { IKeyboard } from '../../../services/hid/Hid';
import Lighting from './Lighting';

export type Hsv = {
  h: number;
  s: number;
  v: number;
};

type Props = {
  underglowEffects: [string, number][];
  keyboard: IKeyboard;
  showBacklight: boolean;
  showUnderglow: boolean;
  // eslint-disable-next-line no-unused-vars
  onChangeUnderglow: (underglow: {
    typeIndex?: number;
    color?: Hsv; // h: 0-360, s: 0-100, v: 0-100
  }) => void;
  // eslint-disable-next-line no-unused-vars
  onChangeBacklight: (backlight: {
    isBreathing?: boolean;
    brightness?: number /* 0-255 */;
  }) => void;
};

type State = {
  underglowColorCount: number; // Num of colors that the underglow type can use.
  underglowColor: Hsv;
  underglowHex: string;
  underglowEffectMode: number;
  backlightBreathing: boolean;
  backlightBrightness: number; // 0-255
};

export default class TabLighting extends React.Component<Props, State> {
  private readonly UPDATE_VALUE_DURATION = 400;
  private colorWheelRef: React.RefObject<HTMLDivElement>;
  private colorWheel: ReinventedColorWheel | null = null;
  private underglowEffects: [string, number][];
  private initializing = true;
  private updateUnderglowValueMsec = 0;
  private updateBackgroundValueMsec = 0;

  constructor(props: Props | Readonly<Props>) {
    super(props);
    this.colorWheelRef = React.createRef<HTMLDivElement>();
    this.underglowEffects = this.props.underglowEffects
      ? this.props.underglowEffects
      : [];

    this.state = {
      underglowColorCount: 0,
      underglowColor: { h: 0, s: 0, v: 0 },
      underglowHex: '#',
      underglowEffectMode: 0,
      backlightBreathing: false,
      backlightBrightness: 0,
    };
  }

  get disabledColorChange() {
    return this.state.underglowColorCount === 0;
  }

  private buildColorWheel() {
    const { h, s, v } = this.state.underglowColor;
    const colorWheel = new ReinventedColorWheel({
      appendTo: this.colorWheelRef.current!,
      hsv: [h, s, v],

      // appearance
      wheelDiameter: 180,
      wheelThickness: 20,
      handleDiameter: 16,
      wheelReflectsSaturation: true,

      onChange: (color) => {
        this.onChangeColorWheel(color);
      },
    });
    const underglowHex = colorWheel.hex.toUpperCase();
    this.setState({
      underglowColor: { h, s, v },
      underglowHex,
    });
    return colorWheel;
  }

  componentDidMount() {
    if (this.colorWheelRef.current === null) {
      this.colorWheel = null;
      return;
    } else if (this.colorWheel === null) {
      this.colorWheel = this.buildColorWheel();
      Lighting.fetchKeyboardLightValues(this.props.keyboard!).then((value) => {
        const {
          underglowColor,
          underglowEffectMode,
          backlightBreathing,
          backlightBrightness,
        } = value;

        let numOfColors = 0;
        let effectMode = 0;
        const len = this.props.underglowEffects.length;
        if (0 < len && underglowEffectMode < len) {
          effectMode = underglowEffectMode;
          numOfColors = this.props.underglowEffects[effectMode][1];
        }

        this.setState({
          underglowColorCount: numOfColors,
          underglowEffectMode: effectMode,
          backlightBreathing,
          backlightBrightness,
        });

        this.colorWheel!.hsv = [
          underglowColor.h,
          underglowColor.s,
          underglowColor.v,
        ];
      });
    }
  }

  private emitUnderglowValue(underglow: { mode?: number; color?: Hsv }) {
    this.props.onChangeUnderglow(underglow);
  }

  private emitBacklightValue(backlight: {
    isBreathing?: boolean;
    brightness?: number;
  }) {
    this.props.onChangeBacklight(backlight);
  }

  private onChangeColorWheel(_color: ReinventedColorWheel) {
    const color: Hsv = {
      h: Math.round(_color.hsv[0]),
      s: Math.round(_color.hsv[1]),
      v: Math.round(_color.hsv[2]),
    };
    this.setState({
      underglowColor: color,
      underglowHex: _color.hex.toUpperCase(),
    });
    if (this.initializing) {
      // Ignore the initial color setting from componentDidMount()
      this.initializing = false;
    } else {
      const msec = new Date().getTime();
      if (this.UPDATE_VALUE_DURATION < msec - this.updateUnderglowValueMsec) {
        // need to set duration to update hardware configuration because of its network performance.
        this.emitUnderglowValue({ color });
        this.updateUnderglowValueMsec = new Date().getTime();
      }
    }
  }

  private onChangeUnderglowMode(underglowEffectMode: number) {
    const numOfColors = this.underglowEffects[underglowEffectMode][1];
    this.setState({
      underglowEffectMode,
      underglowColorCount: numOfColors,
    });
    const msec = new Date().getTime();
    if (this.UPDATE_VALUE_DURATION < msec - this.updateUnderglowValueMsec) {
      this.emitUnderglowValue({ mode: underglowEffectMode });
      this.updateUnderglowValueMsec = new Date().getTime();
    }
  }

  private onChangeColorHex(hex: string) {
    if (this.colorWheel === null) {
      return;
    }

    const hexNumber = hex
      .toUpperCase()
      .replace(/[^0-9,A-F]/g, '')
      .slice(0, 6);
    const underglowHex = `#${hexNumber}`;
    if (hex.length === 7) {
      this.colorWheel.hex = underglowHex;
    } else {
      this.setState({ underglowHex });
    }
  }

  private onChangeColor(color: Hsv) {
    this.colorWheel!.hsv = [color.h, color.s, color.v];
  }

  private onChangeBacklightBreathing(isBreathing: boolean) {
    this.setState({ backlightBreathing: isBreathing });
    this.emitBacklightValue({ isBreathing });
  }
  private onChangeBacklightBrightness(brightness: number) {
    this.setState({ backlightBrightness: brightness });
    const msec = new Date().getTime();
    if (this.UPDATE_VALUE_DURATION < msec - this.updateBackgroundValueMsec) {
      // need to set duration to update hardware configuration because of its network performance.
      this.emitBacklightValue({ brightness });
      this.updateBackgroundValueMsec = new Date().getTime();
    }
  }

  render() {
    return (
      <Grid container spacing={1} className="lighting-settings">
        {this.props.showUnderglow && (
          <Underglow
            colorWheelRef={this.colorWheelRef}
            disabledColorChange={this.disabledColorChange}
            underglowEffects={this.underglowEffects}
            underglowEffectIndex={this.state.underglowEffectMode}
            underglowHex={this.state.underglowHex}
            underglowColor={this.state.underglowColor}
            onChangeUnderglowTypeIndex={(index) =>
              this.onChangeUnderglowMode(index)
            }
            onChangeColorHex={(hex) => {
              this.onChangeColorHex(hex);
            }}
            onChangeColor={(color) => {
              this.onChangeColor(color);
            }}
          />
        )}
        {this.props.showBacklight && (
          <Backlight
            backlightBreathingMode={this.state.backlightBreathing}
            value={this.state.backlightBrightness}
            onChangeValue={(v) => {
              this.onChangeBacklightBrightness(v);
            }}
            onChangeBreathingMode={(flag) => {
              this.onChangeBacklightBreathing(flag);
            }}
          />
        )}
      </Grid>
    );
  }
}

type UnderglowProps = {
  colorWheelRef: React.RefObject<HTMLDivElement>;
  disabledColorChange: boolean;
  underglowEffects: [string, number][];
  underglowEffectIndex: number;
  underglowHex: string; // #FF11AA
  underglowColor: Hsv;
  // eslint-disable-next-line no-unused-vars
  onChangeUnderglowTypeIndex: (typeIndex: number) => void;
  // eslint-disable-next-line no-unused-vars
  onChangeColorHex: (hex: string) => void;
  // eslint-disable-next-line no-unused-vars
  onChangeColor: (color: Hsv) => void;
};
function Underglow(props: UnderglowProps) {
  return (
    <React.Fragment>
      <Grid item xs={12}>
        <h4>UNDERGLOW</h4>
      </Grid>
      <Grid item xs={6}>
        <Grid container spacing={1} justify="center" alignItems="center">
          <Grid item xs={12}>
            <div className="lighting-label">Effect Mode</div>
            <div>
              <Select
                className="lighting-value"
                defaultValue={props.underglowEffectIndex}
                value={props.underglowEffectIndex}
                onChange={(e) => {
                  props.onChangeUnderglowTypeIndex(Number(e.target.value));
                }}
              >
                {props.underglowEffects.map((effect, index) => {
                  return (
                    <MenuItem
                      key={index}
                      value={index}
                    >{`${effect[0]}`}</MenuItem>
                  );
                })}
              </Select>
            </div>
          </Grid>
          <Grid item xs={12}>
            <div
              className={`lighting-label underglow-label-color ${
                props.disabledColorChange && 'lighting-label-disabled'
              }`}
            >
              Color
            </div>
            <div className="underglow-color">
              <TextField
                label="RGB"
                className="underglow-color-value color-rgb"
                value={props.underglowHex}
                disabled={props.disabledColorChange}
                onChange={(e) => props.onChangeColorHex(e.target.value)}
              />
              <TextField
                label="Hue"
                className="underglow-color-value color-hue"
                type="number"
                inputProps={{ min: '0', max: '360' }}
                value={props.underglowColor.h}
                disabled={props.disabledColorChange}
                onChange={(e) => {
                  props.onChangeColor({
                    ...props.underglowColor,
                    h: Number(e.target.value),
                  });
                }}
              />
              <TextField
                label="Saturation"
                className="underglow-color-value color-saturation"
                type="number"
                inputProps={{ min: '0', max: '100' }}
                value={props.underglowColor.s}
                disabled={props.disabledColorChange}
                onChange={(e) => {
                  props.onChangeColor({
                    ...props.underglowColor,
                    s: Number(e.target.value),
                  });
                }}
              />
              <TextField
                label="Brightness"
                className="underglow-color-value color-brightness"
                type="number"
                inputProps={{ min: '0', max: '100' }}
                value={props.underglowColor.v}
                onChange={(e) => {
                  props.onChangeColor({
                    ...props.underglowColor,
                    v: Number(e.target.value),
                  });
                }}
              />
            </div>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={6}>
        <Grid container>
          <Grid item xs={10}>
            <div ref={props.colorWheelRef} className="color-wheel">
              {props.disabledColorChange && (
                <div className="color-wheel-disabled"></div>
              )}
            </div>
          </Grid>
          <Grid item xs={2}>
            <BrightnessSlider
              brightness={props.underglowColor.v}
              onChange={(brightness) => {
                props.onChangeColor({
                  ...props.underglowColor,
                  v: brightness,
                });
              }}
            />
          </Grid>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}

type BrightnessSliderProps = {
  brightness: number;
  // eslint-disable-next-line no-unused-vars
  onChange: (brightness: number) => void;
};
type BrightnessSliderState = {
  isDragging: boolean;
  rect: { top: number };
};
class BrightnessSlider extends React.Component<
  BrightnessSliderProps,
  BrightnessSliderState
> {
  private readonly HEIGHT = 180;
  private readonly WIDTH = 16;
  private readonly CIRCLE_R = 7;
  private readonly STROKE_WIDTH = 1;
  private readonly MIN_HEIGHT = this.CIRCLE_R + this.STROKE_WIDTH;
  private readonly MAX_HEIGHT = this.HEIGHT - this.CIRCLE_R - this.STROKE_WIDTH;
  private readonly RANGE = this.MAX_HEIGHT - this.MIN_HEIGHT;

  private rectRef: React.RefObject<SVGRectElement>;
  constructor(props: BrightnessSliderProps) {
    super(props);
    this.state = {
      isDragging: false,
      rect: { top: 0 },
    };
    this.rectRef = React.createRef<SVGRectElement>();
  }

  get y() {
    return this.RANGE * ((100 - this.props.brightness) / 100) + this.MIN_HEIGHT;
  }

  private emitBrightness(y: number) {
    const brightness =
      100 - Math.round((100 * (y - this.MIN_HEIGHT)) / this.RANGE);

    this.props.onChange(brightness);
  }

  private onMouseDown(e: React.MouseEvent<SVGRectElement, MouseEvent>) {
    const rect = this.rectRef.current!.getBoundingClientRect();
    this.setState({ isDragging: true, rect });
    let y = e.clientY - rect.top;
    this.emitBrightness(y);
  }

  private onMouseUp() {
    this.setState({ isDragging: false });
  }

  private onMouseMove(e: React.MouseEvent<SVGRectElement, MouseEvent>) {
    if (this.state.isDragging) {
      e.preventDefault();
      let y = e.clientY - this.state.rect.top;
      if (y < this.MIN_HEIGHT) {
        y = this.MIN_HEIGHT;
      } else if (this.MAX_HEIGHT < y) {
        y = this.MAX_HEIGHT;
      }
      this.emitBrightness(y);
    }
  }

  render() {
    return (
      <svg width="16" height={this.HEIGHT}>
        <defs>
          <linearGradient id="brightness" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="5%" stopColor="#fff"></stop>
            <stop offset="95%" stopColor="#000"></stop>
          </linearGradient>
        </defs>
        <rect
          rx={this.WIDTH / 2}
          ry={this.WIDTH / 2}
          x="0"
          y="0"
          width={this.WIDTH}
          height={this.HEIGHT}
          strokeWidth="0"
          fill="url(#brightness)"
          ref={this.rectRef}
          onMouseDown={(e) => {
            this.onMouseDown(e);
          }}
          onMouseMove={(e) => {
            this.onMouseMove(e);
          }}
          onMouseUp={() => {
            this.onMouseUp();
          }}
        ></rect>
        <svg x={this.WIDTH / 2} y={this.y} style={{ overflow: 'visible' }}>
          <circle
            r={this.CIRCLE_R - 1}
            fill="none"
            strokeWidth={this.STROKE_WIDTH}
            stroke="#000"
          ></circle>
          <circle
            r={this.CIRCLE_R}
            fill="none"
            strokeWidth={this.STROKE_WIDTH * 2}
            stroke="#fff"
          ></circle>
        </svg>
      </svg>
    );
  }
}

type BacklightProps = {
  backlightBreathingMode: boolean;
  value: number;
  // eslint-disable-next-line no-unused-vars
  onChangeBreathingMode: (f: boolean) => void;
  // eslint-disable-next-line no-unused-vars
  onChangeValue: (v: number) => void;
};
function Backlight(props: BacklightProps) {
  return (
    <React.Fragment>
      <Grid item xs={12}>
        <h4>BACKLIGHT</h4>
      </Grid>
      <Grid item xs={6}>
        <div className="lighting-label">
          Breathing Mode
          <Switch
            checked={props.backlightBreathingMode}
            onChange={(e) => {
              props.onChangeBreathingMode(e.target.checked);
            }}
            color="primary"
            name="brightness"
          />
        </div>

        <div className="lighting-label">Brightness ({props.value})</div>
        <div>
          <Slider
            className="lighting-value"
            value={props.value}
            onChange={(event: any, newValue: number | number[]) => {
              props.onChangeValue(newValue as number);
            }}
            aria-labelledby="continuous-slider"
            min={0}
            max={100}
          />
        </div>
      </Grid>
    </React.Fragment>
  );
}
