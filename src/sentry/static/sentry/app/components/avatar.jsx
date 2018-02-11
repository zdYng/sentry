import PropTypes from 'prop-types';
import React from 'react';
import $ from 'jquery';
import ConfigStore from '../stores/configStore';
import UserLetterAvatar from '../components/userLetterAvatar';

class Avatar extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    size: PropTypes.number,
    default: PropTypes.string,
    title: PropTypes.string,
    gravatar: PropTypes.bool,
  };

  static defaultProps = {
    className: 'avatar',
    size: 64,
    gravatar: true,
  };

  constructor(...args) {
    super(...args);
    this.state = {
      gravatarUrl: null,
      showBackupAvatar: false,
      loadError: false,
    };
  }

  componentDidMount() {
    this.buildGravatarUrl();
  }

  componentWillReceiveProps() {
    this.buildGravatarUrl();
  }

  buildGravatarUrl = () => {
    let avatarType = this.getAvatarType();

    if (avatarType !== 'gravatar') return;

    import(/*webpackChunkName: "crypto-js/md5"*/ 'crypto-js/md5').then(MD5 => {
      let {user} = this.props;
      let url = ConfigStore.getConfig().gravatarBaseUrl + '/avatar/';

      url += MD5(user.email.toLowerCase());

      let query = {
        s: this.props.size || undefined,
        d: this.props.default || 'blank',
      };

      url += '?' + $.param(query);

      this.setState({gravatarUrl: url});
      return url;
    });
  };

  buildProfileUrl = () => {
    let url = '/avatar/' + this.props.user.avatar.avatarUuid + '/';
    if (this.props.size) {
      url += '?' + $.param({s: this.props.size});
    }
    return url;
  };

  getAvatarType = () => {
    let {user} = this.props;
    let avatarType = null;
    if (user.avatar) {
      avatarType = user.avatar.avatarType;
    } else {
      avatarType = user.email && this.props.gravatar ? 'gravatar' : 'letter_avatar';
    }
    if (user.options && user.options.avatarType) {
      avatarType = user.options.avatarType;
    }
    return avatarType;
  };

  onLoad = () => {
    this.setState({showBackupAvatar: true});
  };

  onError = () => {
    this.setState({showBackupAvatar: true, loadError: true});
  };

  renderImg = () => {
    if (this.state.loadError) {
      return null;
    }
    let user = this.props.user;
    let avatarType = this.getAvatarType();
    let props = {
      title: this.props.title,
      onError: this.onError,
      onLoad: this.onLoad,
    };

    if (avatarType === 'gravatar') {
      if (!this.state.gravatarUrl) {
        return null;
      }

      return <img src={this.state.gravatarUrl} {...props} />;
    } else if (avatarType === 'upload') {
      return <img src={this.buildProfileUrl()} {...props} />;
    } else {
      return <UserLetterAvatar user={user} />;
    }
  };

  render() {
    let user = this.props.user;
    if (!user) {
      return null;
    }

    return (
      <span className={this.props.className} style={this.props.style}>
        {this.state.showBackupAvatar && <UserLetterAvatar user={user} />}
        {this.renderImg()}
      </span>
    );
  }
}

export default Avatar;
