from __future__ import absolute_import


from datetime import datetime
import json
import pytest
import requests
import responses
import time

from sentry.utils import snuba
from sentry.models import GroupHash, EventUser
from sentry.testutils import TestCase
from sentry.tagstore.snuba.backend import SnubaTagStorage


class TagStorage(TestCase):
    def setUp(self):
        assert requests.post(snuba.SNUBA + '/tests/drop').status_code == 200

        self.ts = SnubaTagStorage()

        self.proj1 = self.create_project()
        self.proj1env1 = self.create_environment(project=self.proj1, name='test')

        self.proj1group1 = self.create_group(self.proj1)
        self.proj1group2 = self.create_group(self.proj1)

        hash1 = '1' * 32
        hash2 = '2' * 32
        GroupHash.objects.create(project=self.proj1, group=self.proj1group1, hash=hash1)
        GroupHash.objects.create(project=self.proj1, group=self.proj1group2, hash=hash2)

        now = datetime.now()
        data = json.dumps([{
            'event_id': 'x' * 32,
            'primary_hash': hash1,
            'project_id': self.proj1.id,
            'message': 'message 1',
            'platform': 'python',
            'datetime': now.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            'data': {
                'received': time.mktime(now.timetuple()) - r,
                'tags': {
                    'foo': 'bar',
                    'baz': 'quux',
                    'environment': self.proj1env1.name,
                    'sentry:release': 100 * r,
                },
                'sentry.interfaces.User': {
                    'id': "user{}".format(r)
                }
            },
        } for r in range(1, 3)] + [{
            'event_id': 'x' * 32,
            'primary_hash': hash2,
            'project_id': self.proj1.id,
            'message': 'message 2',
            'platform': 'python',
            'datetime': now.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            'data': {
                'received': time.mktime(now.timetuple()) - r,
                'tags': {
                    'browser': 'chrome',
                    'environment': self.proj1env1.name,
                },
                'sentry.interfaces.User': {
                    'id': "user1"
                }
            },
        }])

        assert requests.post(snuba.SNUBA + '/tests/insert', data=data).status_code == 200

    @responses.activate
    def test_get_group_ids_for_search_filter(self):
        from sentry.search.base import ANY
        tags = {
            'foo': 'bar',
            'baz': 'quux',
        }

        with responses.RequestsMock() as rsps:
            def snuba_response(request):
                body = json.loads(request.body)
                assert body['project'] == [self.proj1.id]
                assert body['groupby'] == ['issue']
                assert body['issues']
                assert ['tags[foo]', '=', 'bar'] in body['conditions']
                assert ['tags[baz]', '=', 'quux'] in body['conditions']
                return (200, {}, json.dumps({
                    'meta': [{'name': 'issue'}, {'name': 'aggregate'}],
                    'data': [{'issue': self.proj1group1.id, 'aggregate': 1}],
                }))

            rsps.add_callback(responses.POST, snuba.SNUBA + '/query', callback=snuba_response)
            result = self.ts.get_group_ids_for_search_filter(self.proj1.id, self.proj1env1.id, tags)
            assert result == [self.proj1group1.id]

        tags = {
            'foo': ANY,
        }

        with responses.RequestsMock() as rsps:
            def snuba_response_2(request):
                body = json.loads(request.body)
                assert body['project'] == [self.proj1.id]
                assert body['groupby'] == ['issue']
                assert body['issues']
                assert ['tags[foo]', 'IS NOT NULL', None] in body['conditions']
                return (200, {}, json.dumps({
                    'meta': [{'name': 'issue'}, {'name': 'aggregate'}],
                    'data': [{'issue': self.proj1group2.id, 'aggregate': 1}],
                }))

            rsps.add_callback(responses.POST, snuba.SNUBA + '/query', callback=snuba_response_2)
            result = self.ts.get_group_ids_for_search_filter(self.proj1.id, self.proj1env1.id, tags)
            assert result == [self.proj1group2.id]

    def test_get_group_tag_keys_and_top_values(self):
        result = self.ts.get_group_tag_keys_and_top_values(
            self.proj1.id,
            self.proj1group1.id,
            self.proj1env1.id,
        )
        result.sort(key=lambda r: r['id'])
        assert result[0]['key'] == 'baz'
        assert result[1]['key'] == 'foo'

        assert result[0]['uniqueValues'] == 1
        assert result[0]['totalValues'] == 2

        assert result[0]['topValues'][0]['value'] == 'quux'
        assert result[1]['topValues'][0]['value'] == 'bar'

    def test_get_top_group_tag_values(self):
        resp = self.ts.get_top_group_tag_values(
            self.proj1.id,
            self.proj1group1.id,
            self.proj1env1.id,
            'foo',
            1
        )
        assert len(resp) == 1
        assert resp[0].times_seen == 2
        assert resp[0].key == 'foo'
        assert resp[0].value == 'bar'
        assert resp[0].group_id == self.proj1group1.id

    def test_get_group_tag_value_count(self):
        assert self.ts.get_group_tag_value_count(
            self.proj1.id,
            self.proj1group1.id,
            self.proj1env1.id,
            'foo'
        ) == 2

    def test_get_group_tag_key(self):
        from sentry.tagstore.exceptions import GroupTagKeyNotFound
        with pytest.raises(GroupTagKeyNotFound):
            self.ts.get_group_tag_key(
                project_id=self.proj1.id,
                group_id=self.proj1group1.id,
                environment_id=self.proj1env1.id,
                key='notreal',
            )

        assert self.ts.get_group_tag_key(
            project_id=self.proj1.id,
            group_id=self.proj1group1.id,
            environment_id=self.proj1env1.id,
            key='foo',
        ).key == 'foo'

        keys = self.ts.get_group_tag_keys(
            project_id=self.proj1.id,
            group_id=self.proj1group1.id,
            environment_id=self.proj1env1.id,
        )
        keys.sort(key=lambda x: x.key)
        assert len(keys) == 2
        assert keys[0].key == 'baz'
        assert keys[0].times_seen == 2
        assert keys[1].key == 'foo'
        assert keys[1].times_seen == 2

    def test_get_group_tag_value(self):
        from sentry.tagstore.exceptions import GroupTagValueNotFound
        with pytest.raises(GroupTagValueNotFound):
            self.ts.get_group_tag_value(
                project_id=self.proj1.id,
                group_id=self.proj1group1.id,
                environment_id=self.proj1env1.id,
                key='foo',
                value='notreal',
            )

        assert self.ts.get_group_tag_values(
            project_id=self.proj1.id,
            group_id=self.proj1group1.id,
            environment_id=self.proj1env1.id,
            key='notreal',
        ) == []

        assert self.ts.get_group_tag_values(
            project_id=self.proj1.id,
            group_id=self.proj1group1.id,
            environment_id=self.proj1env1.id,
            key='foo',
        )[0].value == 'bar'

        assert self.ts.get_group_tag_value(
            project_id=self.proj1.id,
            group_id=self.proj1group1.id,
            environment_id=self.proj1env1.id,
            key='foo',
            value='bar',
        ).value == 'bar'

    def test_get_groups_user_counts(self):
        assert self.ts.get_groups_user_counts(
            project_id=self.proj1.id,
            group_ids=[self.proj1group1.id, self.proj1group2.id],
            environment_id=self.proj1env1.id
        ) == {
            self.proj1group1.id: 2,
            self.proj1group2.id: 1,
        }

    def test_get_releases(self):
        assert self.ts.get_first_release(
            project_id=self.proj1.id,
            group_id=self.proj1group1.id,
        ) == '200'

        assert self.ts.get_first_release(
            project_id=self.proj1.id,
            group_id=self.proj1group2.id,
        ) is None

        assert self.ts.get_last_release(
            project_id=self.proj1.id,
            group_id=self.proj1group1.id,
        ) == '100'

        assert self.ts.get_last_release(
            project_id=self.proj1.id,
            group_id=self.proj1group2.id,
        ) is None

    def test_get_group_ids_for_users(self):

        assert set(self.ts.get_group_ids_for_users(
            [self.proj1.id],
            [EventUser(project_id=self.proj1.id, ident='user1')]
        )) == set([self.proj1group1.id, self.proj1group2.id])

        assert set(self.ts.get_group_ids_for_users(
            [self.proj1.id],
            [EventUser(project_id=self.proj1.id, ident='user2')]
        )) == set([self.proj1group1.id])
