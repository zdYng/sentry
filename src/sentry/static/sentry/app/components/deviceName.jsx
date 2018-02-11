import PropTypes from 'prop-types';
import React from 'react';

export default class DeviceName extends React.Component {
  static propTypes = {
    children: PropTypes.string,
  };

  constructor(...args) {
    super(...args);
    this.state = {
      deviceNameMapper: null,
    };
  }

  componentWillMount() {
    import(/*webpackChunkName: "deviceNameMapper"*/ '../utils/deviceNameMapper')
      .then(module => module.default)
      .then(deviceNameMapper => this.setState({deviceNameMapper}));
  }

  render() {
    let {deviceNameMapper} = this.state;

    // Better than empty
    if (!deviceNameMapper) return this.props.children;

    return deviceNameMapper(this.props.children);
  }
}
