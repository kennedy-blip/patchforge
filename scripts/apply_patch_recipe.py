"""Apply declarative branding changes to an apktool-decoded project."""
import json
import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

ANDROID = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ANDROID)
A = '{' + ANDROID + '}'
FLAGS = {'debuggable', 'allowBackup', 'usesCleartextTraffic'}


def apply(root, recipe):
    if not isinstance(recipe, dict) or recipe.keys() - (FLAGS | {'app_name', 'package_suffix', 'colorPrimary'}):
        raise ValueError('Unsupported recipe')
    suffix = recipe.get('package_suffix', '')
    if not re.fullmatch(r'(?:\.[a-z][a-z0-9_]*)*', suffix) or len(suffix) > 64:
        raise ValueError('Invalid suffix')
    label = recipe.get('app_name')
    if label is not None and (not isinstance(label, str) or not 1 <= len(label) <= 80 or not all(c.isprintable() for c in label)):
        raise ValueError('Invalid label')
    color = recipe.get('colorPrimary')
    if color is not None and not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        raise ValueError('Invalid color')
    if any(type(recipe[k]) is not bool for k in FLAGS & recipe.keys()):
        raise ValueError('Expected boolean flag')
    manifest = root / 'AndroidManifest.xml'
    tree = ET.parse(manifest)
    app = tree.find('application')
    if app is None:
        raise ValueError('Missing application')
    original = tree.getroot().attrib['package']
    if suffix:
        for node in tree.iter():
            for key in ('name', 'targetActivity', 'backupAgent', 'appComponentFactory'):
                value = node.get(A + key, '')
                if value.startswith('.'):
                    node.set(A + key, original + value)
            if node.tag == 'provider' and node.get(A + 'authorities'):
                node.set(A + 'authorities', node.get(A + 'authorities').replace(original, original + suffix))
        tree.getroot().set('package', original + suffix)
    for k in FLAGS & recipe.keys():
        app.set(A + k, str(recipe[k]).lower())
    for filename, tag, name, value in [('strings', 'string', 'app_name', label), ('colors', 'color', 'colorPrimary', color)]:
        if value is None:
            continue
        path = root / 'res' / 'values' / (filename + '.xml')
        path.parent.mkdir(parents=True, exist_ok=True)
        res = ET.parse(path) if path.exists() else ET.ElementTree(ET.Element('resources'))
        node = res.find(f"{tag}[@name='{name}']")
        if node is None:
            node = ET.SubElement(res.getroot(), tag, name=name)
        node.text = value
        res.write(path, encoding='utf-8', xml_declaration=True)
    if label is not None:
        app.set(A + 'label', '@string/app_name')
    tree.write(manifest, encoding='utf-8', xml_declaration=True)


if __name__ == '__main__':
    apply(Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text()))
