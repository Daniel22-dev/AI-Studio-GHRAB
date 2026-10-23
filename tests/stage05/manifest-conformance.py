"""Optional full JSON Schema conformance check, requires `jsonschema`.

Usage: python tests/stage05/manifest-conformance.py /path/to/apps.generated.json
The default is the local generated registry. Does not alter any file.
"""
from pathlib import Path
import json
import sys
from jsonschema import Draft202012Validator, FormatChecker
root=Path(__file__).resolve().parents[2]
manifest_path=Path(sys.argv[1]) if len(sys.argv)>1 else root/'src/config/apps.generated.json'
schema=json.loads((root/'src/schemas/ai-studio-app-manifest-v1.schema.json').read_text())
Draft202012Validator.check_schema(schema)
apps=json.loads(manifest_path.read_text())
assert isinstance(apps,list), 'app registry must be a list'
validator=Draft202012Validator(schema,format_checker=FormatChecker())
# Backwards-compatible positive and security-negative examples, evaluated
# against exactly the same public schema as the app registry.
import copy
sample=copy.deepcopy(apps[0])
assert validator.is_valid(sample), 'baseline manifest must remain valid'
with_flow=copy.deepcopy(sample)
with_flow['materialFlow']={
    'bridgeVersion':2,
    'importSchemas':['ghrab-material-v1'],
    'contentTypes':['source-text'],
    'verification':'source-reviewed'
}
assert validator.is_valid(with_flow), 'valid optional materialFlow rejected'
wrong_bridge=copy.deepcopy(with_flow)
wrong_bridge['materialFlow']['bridgeVersion']=1
assert not validator.is_valid(wrong_bridge), 'bridge v1 incorrectly accepted'
unsafe_ai=copy.deepcopy(sample)
unsafe_ai['aiCore']['unknownPermissionEscalation']=True
assert not validator.is_valid(unsafe_ai), 'unknown aiCore property incorrectly accepted'
not_app=next((x for x in apps if x.get('aiCore',{}).get('status')=='not-applicable'), None)
if not_app:
    assert validator.is_valid(not_app), 'not-applicable AI core status rejected'
    invalid=copy.deepcopy(not_app)
    invalid['aiCore']['serverReady']=True
    assert not validator.is_valid(invalid), 'AI disabled consumer obtained server AI flags'
print('SCHEMA_POLICY_NEGATIVE_GATES_PASS')
errors=[]
for app in apps:
    for e in validator.iter_errors(app):
        errors.append((app.get('id'),e.json_path,e.message))
if errors:
    for app,path,message in errors[:25]: print(f'FAIL {app} {path}: {message}')
    raise SystemExit(1)
print(f'APP_MANIFEST_JSON_SCHEMA_PASS: {len(apps)}/{len(apps)} ({manifest_path})')
