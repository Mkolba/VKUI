import React, { Children, Component, HTMLAttributes, ReactElement } from 'react';
import PopoutWrapper from '../PopoutWrapper/PopoutWrapper';
import getClassName from '../../helpers/getClassName';
import classNames from '../../lib/classNames';
import transitionEvents from '../../lib/transitionEvents';
import withInsets from '../../hoc/withInsets';
import withPlatform from '../../hoc/withPlatform';
import withAdaptivity, { AdaptivityProps, ViewMode } from '../../hoc/withAdaptivity';
import { isNumeric } from '../../lib/utils';
import { HasInsets, HasPlatform } from '../../types';
import { ANDROID, IOS } from '../../lib/platform';

export interface ActionSheetProps extends HTMLAttributes<HTMLDivElement>, HasPlatform, HasInsets, AdaptivityProps {
  /**
   * iOS only
   */
  header?: React.ReactNode;
  /**
   * iOS only
   */
  text?: React.ReactNode;
  onClose(): void;
  /**
   * Desktop only
   */
  toggleRef?: Element;
}

export interface ActionSheetState {
  closing: boolean;
}

export type CloseCallback = () => void;

export type ClickHandler = (event: React.MouseEvent<HTMLDivElement>) => void;

export type ActionType = (event: React.MouseEvent) => void;

export type ItemClickHandler = (action: ActionType, autoclose: boolean) => (event: React.MouseEvent) => void;

export type AnimationEndCallback = (e?: AnimationEvent) => void;

export type IsItemLast = (index: number) => boolean;

class ActionSheet extends Component<ActionSheetProps, ActionSheetState> {
  constructor(props: ActionSheetProps) {
    super(props);
    this.elRef = React.createRef();
  }

  state: ActionSheetState = {
    closing: false,
  };

  elRef: React.RefObject<HTMLDivElement>;

  onClose: CloseCallback = () => {
    this.setState({ closing: true });
    this.waitTransitionFinish(this.props.onClose);
  };

  onItemClick: ItemClickHandler = (action: ActionType, autoclose: boolean) => (event: React.MouseEvent) => {
    event.persist();

    if (autoclose) {
      this.setState({ closing: true });
      this.waitTransitionFinish(() => {
        autoclose && this.props.onClose();
        action && action(event);
      });
    } else {
      action && action(event);
    }
  };

  stopPropagation: ClickHandler = (e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation();

  waitTransitionFinish(eventHandler: AnimationEndCallback) {
    if (this.props.viewMode >= ViewMode.TABLET) {
      eventHandler();
    }

    if (transitionEvents.supported) {
      const eventName = transitionEvents.prefix ? transitionEvents.prefix + 'TransitionEnd' : 'transitionend';

      this.elRef.current.removeEventListener(eventName, eventHandler);
      this.elRef.current.addEventListener(eventName, eventHandler);
    } else {
      setTimeout(eventHandler, this.props.platform === ANDROID ? 200 : 300);
    }
  }

  isItemLast: IsItemLast = (index: number) => {
    const childrenArray = Children.toArray(this.props.children);
    const lastElement = childrenArray[childrenArray.length - 1] as ReactElement;

    if (index === childrenArray.length - 1) {
      return true;
    } else if (index === childrenArray.length - 2 && lastElement.props.mode === 'cancel') {
      return true;
    }

    return false;
  };

  getDropdownCoords: () => { right: number; top: number } = () => {
    const { toggleRef } = this.props;

    const { x, y, width, height } = toggleRef.getBoundingClientRect();
    const right = innerWidth - (x + width);
    const top = + y + height + 10;

    return { right, top };
  };

  render() {
    const { children, className, header, text, style, insets, platform, viewMode, ...restProps } = this.props;

    let dropdownCoords = {};
    let baseClaseName;
    const isDesktop = viewMode >= ViewMode.TABLET;

    if (isDesktop) {
      baseClaseName = 'ActionSheet--desktop';
      dropdownCoords = {
        ...this.getDropdownCoords(),
        left: 'auto',
      };
    } else {
      baseClaseName = getClassName('ActionSheet', platform);
    }

    return (
      <PopoutWrapper
        closing={this.state.closing}
        alignY="bottom"
        className={className}
        style={style}
        onClick={this.onClose}
        hasMask={!isDesktop}
      >
        <div
          {...restProps}
          ref={this.elRef}
          onClick={this.stopPropagation}
          style={{ ...dropdownCoords }}
          className={classNames(baseClaseName, {
            'ActionSheet--closing': this.state.closing,
          })}
        >
          {platform === IOS &&
          <header className="ActionSheet__header">
            {header && <div className="ActionSheet__title">{header}</div>}
            {text && <div className="ActionSheet__text">{text}</div>}
          </header>
          }
          {Children.toArray(children).map((child: React.ReactElement, index: number, arr: []) =>
            child && React.cloneElement(child, {
              onClick: this.onItemClick(child.props.onClick, child.props.autoclose),
              style: index === arr.length - 1 && isNumeric(insets.bottom) ? { marginBottom: insets.bottom } : null,
              isLast: this.isItemLast(index),
            }),
          )}
        </div>
      </PopoutWrapper>
    );
  }
}

export default withAdaptivity(withPlatform(withInsets(ActionSheet)), {
  viewMode: true,
});
