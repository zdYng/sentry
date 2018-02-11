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
    access: PropTypes.object.isRequired,
    initialData: PropTypes.object.isRequired,
  },

  mixins: [ApiMixin],

  render() {
    let {initialData, orgId, projectId, access} = this.props;

    return (
      <Form
        apiMethod="POST"
        apiEndpoint={`/projects/${orgId}/${projectId}/hooks/`}
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
  renderBody() {
    let {orgId, projectId} = this.props.params;
    return (
      <div>
        <SettingsPageHeader title={t('Create Service Hook')} />
        <ServiceHookSettingsForm
          {...this.props}
          orgId={orgId}
          projectId={projectId}
          initialData={{...this.state.hook}}
        />
      </div>
    );
  }
}
