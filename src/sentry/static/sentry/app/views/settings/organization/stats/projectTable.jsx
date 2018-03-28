import PropTypes from 'prop-types';
import React from 'react';
import styled from 'react-emotion';
import {Link} from 'react-router';

import Count from '../../../../components/count';
import {t} from '../../../../locale';

import Panel from '../../components/panel';
import PanelBody from '../../components/panelBody';
import PanelHeader from '../../components/panelHeader';

const ProjectTable = ({projectMap, projectTotals, orgTotal, organization}) => {
  const getPercent = (item, total) => {
    if (total === 0) {
      return '';
    }
    if (item === 0) {
      return '0%';
    }
    return parseInt(item / total * 100, 10) + '%';
  };

  let features = new Set(organization.features);

  if (!projectTotals) {
    return <div />;
  }

  return (
    <Panel>
      <PanelHeader>
        <ProjectGrid>
          <div>{t('Project')}</div>
          <div>{t('Accepted')}</div>
          <div>{t('Rate Limited')}</div>
          <div>{t('Filtered')}</div>
          <div>{t('Total')}</div>
        </ProjectGrid>
      </PanelHeader>
      <PanelBody>
        {projectTotals.sort((a, b) => b.received - a.received).map((item, index) => {
          let project = projectMap[item.id];

          if (!project) return null;

          return (
            <ProjectGrid key={index}>
              <div>
                <Link to={`/${organization.slug}/${project.slug}/`}>
                  {features.has('new-teams')
                    ? project.slug
                    : `${project.team.name} / ${project.name}`}
                </Link>
              </div>
              <div>
                <Count value={item.accepted} />
                <br />
                <small>{getPercent(item.accepted, orgTotal.accepted)}</small>
              </div>
              <div>
                <Count value={item.rejected} />
                <br />
                <small>{getPercent(item.rejected, orgTotal.rejected)}</small>
              </div>
              <div>
                <Count value={item.blacklisted} />
                <br />
                <small>{getPercent(item.blacklisted, orgTotal.blacklisted)}</small>
              </div>
              <div>
                <Count value={item.received} />
                <br />
                <small>{getPercent(item.received, orgTotal.received)}</small>
              </div>
            </ProjectGrid>
          );
        })}
      </PanelBody>
    </Panel>
  );
};

ProjectTable.propTypes = {
  projectMap: PropTypes.object.isRequired,
  projectTotals: PropTypes.array.isRequired,
  orgTotal: PropTypes.object.isRequired,
  organization: PropTypes.object.isRequired,
};

const ProjectGrid = styled('div')`
  display: grid;
  grid-template-columns: auto 100px 120px 100px 60px;
  width: 100%;
`;

export default ProjectTable;
