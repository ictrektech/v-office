"""Contract checks exercise responses without inference or a running VOS instance."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch
import httpx
import main
import ai

class APIDocumentationTest(unittest.IsolatedAsyncioTestCase):
    async def test_proxy_relative_docs_and_json_import(self):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url="http://test") as client:
            page = await client.get('/api/v1/docs')
            self.assertIn('../../openapi.json', page.text)
            spec = (await client.get('/openapi.json')).json()
        operation = spec['paths']['/api/v1/ai/sessions/{sid}/import-docx']['post']
        self.assertIn('application/json', operation['requestBody']['content'])
        self.assertNotIn('application/octet-stream', operation['requestBody']['content'])
        self.assertEqual(spec['servers'], [{'url': '.'}])
        self.assertIn('refresh', [p['name'] for p in spec['paths']['/api/v1/sources']['get']['parameters']])

    async def test_session_responses_match_documented_types(self):
        with tempfile.TemporaryDirectory() as root, patch.object(ai, 'AI_HOME', Path(root)), patch.object(ai, '_user', AsyncMock(return_value='contract-test')):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url="http://test") as client:
                session = (await client.post('/api/v1/ai/sessions', json={'title':'Contract'})).json()
                sid = session['id']
                draft = (await client.get(f'/api/v1/ai/sessions/{sid}/draft')).json()
                self.assertIsInstance(draft['blocks'], list)
                put = await client.put(f'/api/v1/ai/sessions/{sid}/transcript', json={'messages':[{'role':'user','text':'Hello','at':'now'}]})
                self.assertEqual(put.json(), {'saved':True})
                transcript = (await client.get(f'/api/v1/ai/sessions/{sid}/transcript')).json()
                self.assertEqual(transcript['messages'][0]['text'], 'Hello')
                removed = (await client.delete(f'/api/v1/ai/sessions/{sid}')).json()
                self.assertEqual(removed, {'deleted':sid})
        spec = main.app.openapi()
        schema = spec['paths']['/api/v1/ai/sessions/{sid}']['delete']['responses']['200']['content']['application/json']['schema']
        self.assertEqual(schema['properties']['deleted']['type'], 'string')
        exported = spec['paths']['/api/v1/ai/sessions/{sid}/docx']['post']['responses']['200']['content']['application/json']['schema']
        self.assertEqual(exported['properties']['saved']['type'], 'string')
