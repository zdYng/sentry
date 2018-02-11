import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import {Box} from 'grid-emotion';

import {t} from '../../../locale';
import AsyncView from '../../asyncView';
import ApiMixin from '../../../mixins/apiMixin';
import Form from '../components/forms/form';
import JsonForm from '../components/forms/jsonForm';
import serviceHookSettingsFields from '../../../data/forms/serviceHookSettings';
import SettingsPageHeader from '../components/settingsPageHeader';

const ServiceHookSettingsForm = createReactClass({
  displayName: 'ServiceHookSettingsForm',

  propTypes: {
    location: PropTypes.object,
    orgId: PropTypes.string.isRequired,
    projectId: PropTypes.string.isRequired,
    hookId: PropTypes.string.isRequired,
    access: PropTypes.object.isRequired,
    initialData: PropTypes.object.isRequired,
  },

  mixins: [ApiMixin],

  render() {
    let {initialData, orgId, projectId, hookId, access} = this.props;

    return (
      <Form
        apiMethod="PUT"
        apiEndpoint={`/projects/${orgId}/${projectId}/hooks/${hookId}/`}
        saveOnBlur
        allowUndo
        initialData={initialData}
      >
        <Box>
          <JsonForm
            access={access}
            location={this.props.location}
            forms={serviceHookSettingsFields}
          />
        </Box>
      </Form>
    );
  },
});

export default class ProjectServiceHookDetails extends AsyncView {
  getEndpoints() {
    let {orgId, projectId, hookId} = this.props.params;
    return [['hook', `/projects/${orgId}/${projectId}/hooks/${hookId}/`]];
  }

  renderBody() {
    let {orgId, projectId, hookId} = this.props.params;
    return (
      <div>
        <SettingsPageHeader title={t('Service Hook Details')} />
        <ServiceHookSettingsForm
          {...this.props}
          orgId={orgId}
          projectId={projectId}
          hookId={hookId}
          initialData={{...this.state.hook}}
        />
      </div>
    );
  }
}
