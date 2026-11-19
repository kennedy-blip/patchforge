from tempfile import TemporaryDirectory
import unittest
from pathlib import Path
from apply_patch_recipe import apply, ET, A

class PatchTests(unittest.TestCase):
    def test_branding(self):
        with TemporaryDirectory() as tmp:
            p = Path(tmp)
            m = p / 'AndroidManifest.xml'
            m.write_text('<manifest package="dev.notes"><application/></manifest>')
            apply(p, {'app_name':'A & B','package_suffix':'.test','allowBackup':False})
            self.assertEqual(ET.parse(m).getroot().get('package'), 'dev.notes.test')
            self.assertEqual(ET.parse(m).find('application').get(A+'allowBackup'), 'false')
            self.assertEqual(ET.parse(p/'res/values/strings.xml').find('string').text,'A & B')
    def test_rejections(self):
        for recipe in [{'package_suffix':'/bad'}, {'debuggable':'false'}, {'command':'whoami'}, {'colorPrimary':'red'}]:
            with self.assertRaises(ValueError):
                apply(Path('.'), recipe)
