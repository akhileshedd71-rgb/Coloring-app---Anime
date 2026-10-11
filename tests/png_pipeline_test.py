"""Meaningful source-to-assets checks; all files stay inside a temporary project."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image, ImageDraw

module_spec = importlib.util.spec_from_file_location('png_pipeline', Path(__file__).resolve().parents[1]/'scripts/build-png-art.py')
pipeline = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(pipeline)


class PngPipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.original_root = pipeline.ROOT
        pipeline.ROOT = Path(self.tmp.name)
        (pipeline.ROOT/'assets/source').mkdir(parents=True)
        self.source = pipeline.ROOT/'assets/source/test-ring.png'
        image = Image.new('RGB', (1024, 1024), 'white')
        draw = ImageDraw.Draw(image)
        draw.rectangle((180,180,844,844), outline='black', width=8)
        draw.ellipse((365,365,659,659), outline='black', width=8)
        image.save(self.source)
        self.spec = {'id':'test-ring','source':'assets/source/test-ring.png','title':'Closed regions','category':'Kawaii','difficulty':'Easy','tags':['fixture'],'description':'Synthetic closed-region fixture','palette':['#FFFFFF','#DDAABB','#AADDBB'], 'seeds':[{'x':.05,'y':.05,'color':'#FFFFFF','name':'Paper'},{'x':.25,'y':.25,'color':'#DDAABB','name':'Ring'},{'x':.5,'y':.5,'color':'#AADDBB','name':'Center'}]}

    def tearDown(self):
        pipeline.ROOT = self.original_root
        self.tmp.cleanup()

    def test_holes_and_source_fidelity_and_color_stable_ids(self):
        report = pipeline.build(self.spec)
        self.assertEqual(report['visibleRegions'], 3)
        self.assertGreater(sum(region['holes'] for region in report['regions']), 0)
        actual = np.array(Image.open(pipeline.ROOT/'public/art/lineart/test-ring.png'))
        self.assertTrue(np.array_equal(actual, np.array(Image.open(self.source))))
        self.spec['seeds'][1]['color'] = '#AADDBB'
        recolored = pipeline.build(self.spec)
        self.assertEqual(report['geometrySha256'], recolored['geometrySha256'])
        self.assertEqual([r['id'] for r in report['regions']], [r['id'] for r in recolored['regions']])

    def test_semantic_seeds_detect_an_open_boundary(self):
        image = Image.open(self.source)
        ImageDraw.Draw(image).rectangle((180,400,195,450), fill='white')
        image.save(self.source)
        with self.assertRaisesRegex(ValueError, 'conflicting color seeds'):
            pipeline.build(self.spec)
        self.assertFalse((pipeline.ROOT/'public/art/ink/test-ring.png').exists())

    def test_release_lock_refuses_geometry_changes(self):
        report = pipeline.build(self.spec)
        locked = {key:report[key] for key in ('sourceSha256','geometrySha256')}
        image = Image.open(self.source)
        ImageDraw.Draw(image).rectangle((20,20,100,100), outline='black', width=5)
        image.save(self.source)
        with self.assertRaisesRegex(ValueError, 'immutable released source changed'):
            pipeline.build(self.spec, locked=locked)

    def test_curated_tiny_iris_is_retained_without_promoting_noise(self):
        image = Image.open(self.source)
        draw = ImageDraw.Draw(image)
        draw.rectangle((40,880,110,980), fill='black')
        draw.rectangle((60,910,61,916), fill='white')  # important 14-pixel iris
        draw.rectangle((85,940,86,945), fill='white')  # unmarked 12-pixel speck
        image.save(self.source)
        self.spec['keepSeedRegions'] = True
        self.spec['seeds'].append({'x':60/1023,'y':912/1023,'color':'#AADDBB','name':'Tiny iris'})
        report = pipeline.build(self.spec)
        areas = [region['area'] for region in report['regions']]
        self.assertIn(14, areas)
        self.assertNotIn(12, areas)
        self.assertEqual(report['visibleRegions'], 4)


if __name__ == '__main__':
    unittest.main()
