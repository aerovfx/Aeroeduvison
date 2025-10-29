"""
AI Pattern Generator for WFC
Extract patterns from images or generate procedurally
"""

import numpy as np
from typing import List, Dict, Tuple
from collections import defaultdict
from main import Tile
import random


class PatternGenerator:
    """Generate tile patterns using AI/procedural techniques"""
    
    @staticmethod
    def analyze_image_patterns(image_path: str, tile_size: int = 8) -> Dict:
        """
        Analyze an image and extract tile patterns
        (Simplified - in production would use actual image processing)
        """
        # This is a placeholder - real implementation would use PIL/OpenCV
        # For now, generate procedural patterns
        return PatternGenerator.generate_procedural_patterns('modern')
    
    @staticmethod
    def generate_procedural_patterns(style: str = 'modern') -> Dict:
        """Generate patterns procedurally based on architectural style"""
        
        if style == 'modern':
            return PatternGenerator._generate_modern_building()
        elif style == 'medieval':
            return PatternGenerator._generate_medieval_castle()
        elif style == 'futuristic':
            return PatternGenerator._generate_futuristic()
        elif style == 'nature':
            return PatternGenerator._generate_nature()
        else:
            return PatternGenerator._generate_modern_building()
    
    @staticmethod
    def _generate_modern_building() -> Dict:
        """Modern building pattern"""
        tiles = []
        
        # Glass facade
        glass = Tile(
            id='glass_wall',
            name='Glass Wall',
            model='cube',
            color='#B3E5FC',
            adjacent_rules={
                '+x': ['glass_wall', 'concrete', 'window_frame', 'empty'],
                '-x': ['glass_wall', 'concrete', 'window_frame', 'empty'],
                '+y': ['glass_wall', 'roof_modern', 'empty'],
                '-y': ['concrete', 'floor_modern'],
                '+z': ['glass_wall', 'concrete', 'window_frame', 'empty'],
                '-z': ['glass_wall', 'concrete', 'window_frame', 'empty']
            }
        )
        tiles.append(glass)
        
        # Concrete structure
        concrete = Tile(
            id='concrete',
            name='Concrete',
            model='cube',
            color='#90A4AE',
            adjacent_rules={
                '+x': ['concrete', 'glass_wall', 'steel', 'empty'],
                '-x': ['concrete', 'glass_wall', 'steel', 'empty'],
                '+y': ['concrete', 'glass_wall', 'roof_modern', 'empty'],
                '-y': ['concrete', 'floor_modern'],
                '+z': ['concrete', 'glass_wall', 'steel', 'empty'],
                '-z': ['concrete', 'glass_wall', 'steel', 'empty']
            }
        )
        tiles.append(concrete)
        
        # Steel beam
        steel = Tile(
            id='steel',
            name='Steel Beam',
            model='cube',
            color='#546E7A',
            adjacent_rules={
                '+x': ['steel', 'concrete', 'empty'],
                '-x': ['steel', 'concrete', 'empty'],
                '+y': ['steel', 'concrete', 'empty'],
                '-y': ['steel', 'concrete', 'floor_modern'],
                '+z': ['steel', 'concrete', 'empty'],
                '-z': ['steel', 'concrete', 'empty']
            }
        )
        tiles.append(steel)
        
        # Floor
        floor_modern = Tile(
            id='floor_modern',
            name='Modern Floor',
            model='cube',
            color='#ECEFF1',
            adjacent_rules={
                '+x': ['floor_modern', 'concrete', 'empty'],
                '-x': ['floor_modern', 'concrete', 'empty'],
                '+y': ['glass_wall', 'concrete', 'steel', 'empty'],
                '-y': ['empty'],
                '+z': ['floor_modern', 'concrete', 'empty'],
                '-z': ['floor_modern', 'concrete', 'empty']
            }
        )
        tiles.append(floor_modern)
        
        # Roof
        roof_modern = Tile(
            id='roof_modern',
            name='Modern Roof',
            model='cube',
            color='#37474F',
            adjacent_rules={
                '+x': ['roof_modern', 'empty'],
                '-x': ['roof_modern', 'empty'],
                '+y': ['empty'],
                '-y': ['glass_wall', 'concrete'],
                '+z': ['roof_modern', 'empty'],
                '-z': ['roof_modern', 'empty']
            }
        )
        tiles.append(roof_modern)
        
        # Window frame
        window_frame = Tile(
            id='window_frame',
            name='Window Frame',
            model='cube',
            color='#455A64',
            adjacent_rules={
                '+x': ['window_frame', 'glass_wall', 'empty'],
                '-x': ['window_frame', 'glass_wall', 'empty'],
                '+y': ['window_frame', 'glass_wall', 'empty'],
                '-y': ['glass_wall', 'concrete'],
                '+z': ['window_frame', 'glass_wall', 'empty'],
                '-z': ['window_frame', 'glass_wall', 'empty']
            }
        )
        tiles.append(window_frame)
        
        # Empty
        empty = Tile(
            id='empty',
            name='Empty',
            model='empty',
            color='#FFFFFF',
            adjacent_rules={
                '+x': ['glass_wall', 'concrete', 'steel', 'window_frame', 'roof_modern', 'empty'],
                '-x': ['glass_wall', 'concrete', 'steel', 'window_frame', 'roof_modern', 'empty'],
                '+y': ['glass_wall', 'concrete', 'steel', 'roof_modern', 'empty'],
                '-y': ['floor_modern', 'roof_modern', 'empty'],
                '+z': ['glass_wall', 'concrete', 'steel', 'window_frame', 'roof_modern', 'empty'],
                '-z': ['glass_wall', 'concrete', 'steel', 'window_frame', 'roof_modern', 'empty']
            }
        )
        tiles.append(empty)
        
        return {
            'style': 'modern',
            'name': 'Modern Building',
            'description': 'Contemporary architecture with glass and concrete',
            'tiles': tiles
        }
    
    @staticmethod
    def _generate_medieval_castle() -> Dict:
        """Medieval castle pattern"""
        tiles = []
        
        # Stone wall
        stone_wall = Tile(
            id='stone_wall',
            name='Stone Wall',
            model='cube',
            color='#78909C',
            adjacent_rules={
                '+x': ['stone_wall', 'stone_brick', 'tower', 'empty'],
                '-x': ['stone_wall', 'stone_brick', 'tower', 'empty'],
                '+y': ['stone_wall', 'battlement', 'tower', 'empty'],
                '-y': ['stone_floor', 'foundation'],
                '+z': ['stone_wall', 'stone_brick', 'gate', 'empty'],
                '-z': ['stone_wall', 'stone_brick', 'gate', 'empty']
            }
        )
        tiles.append(stone_wall)
        
        # Stone brick
        stone_brick = Tile(
            id='stone_brick',
            name='Stone Brick',
            model='cube',
            color='#607D8B',
            adjacent_rules={
                '+x': ['stone_brick', 'stone_wall', 'tower', 'empty'],
                '-x': ['stone_brick', 'stone_wall', 'tower', 'empty'],
                '+y': ['stone_brick', 'stone_wall', 'battlement', 'empty'],
                '-y': ['stone_brick', 'stone_floor', 'foundation'],
                '+z': ['stone_brick', 'stone_wall', 'window_slit', 'empty'],
                '-z': ['stone_brick', 'stone_wall', 'window_slit', 'empty']
            }
        )
        tiles.append(stone_brick)
        
        # Tower
        tower = Tile(
            id='tower',
            name='Tower',
            model='cube',
            color='#455A64',
            adjacent_rules={
                '+x': ['tower', 'stone_wall', 'empty'],
                '-x': ['tower', 'stone_wall', 'empty'],
                '+y': ['tower', 'tower_top', 'empty'],
                '-y': ['tower', 'foundation'],
                '+z': ['tower', 'stone_wall', 'empty'],
                '-z': ['tower', 'stone_wall', 'empty']
            }
        )
        tiles.append(tower)
        
        # Battlement
        battlement = Tile(
            id='battlement',
            name='Battlement',
            model='cube',
            color='#546E7A',
            adjacent_rules={
                '+x': ['battlement', 'empty'],
                '-x': ['battlement', 'empty'],
                '+y': ['empty'],
                '-y': ['stone_wall', 'tower'],
                '+z': ['battlement', 'empty'],
                '-z': ['battlement', 'empty']
            }
        )
        tiles.append(battlement)
        
        # Empty
        empty = Tile(
            id='empty',
            name='Empty',
            model='empty',
            color='#FFFFFF',
            adjacent_rules={
                '+x': ['stone_wall', 'stone_brick', 'tower', 'battlement', 'empty'],
                '-x': ['stone_wall', 'stone_brick', 'tower', 'battlement', 'empty'],
                '+y': ['stone_wall', 'stone_brick', 'tower', 'battlement', 'empty'],
                '-y': ['empty'],
                '+z': ['stone_wall', 'stone_brick', 'tower', 'battlement', 'empty'],
                '-z': ['stone_wall', 'stone_brick', 'tower', 'battlement', 'empty']
            }
        )
        tiles.append(empty)
        
        return {
            'style': 'medieval',
            'name': 'Medieval Castle',
            'description': 'Stone walls, towers, and battlements',
            'tiles': tiles
        }
    
    @staticmethod
    def _generate_futuristic() -> Dict:
        """Futuristic sci-fi pattern"""
        tiles = []
        
        # Energy panel
        energy = Tile(
            id='energy_panel',
            name='Energy Panel',
            model='cube',
            color='#00BCD4',
            adjacent_rules={
                '+x': ['energy_panel', 'metal_panel', 'tech_core', 'empty'],
                '-x': ['energy_panel', 'metal_panel', 'tech_core', 'empty'],
                '+y': ['energy_panel', 'antenna', 'empty'],
                '-y': ['metal_panel', 'tech_core'],
                '+z': ['energy_panel', 'metal_panel', 'window_tech', 'empty'],
                '-z': ['energy_panel', 'metal_panel', 'window_tech', 'empty']
            }
        )
        tiles.append(energy)
        
        # Metal panel
        metal = Tile(
            id='metal_panel',
            name='Metal Panel',
            model='cube',
            color='#37474F',
            adjacent_rules={
                '+x': ['metal_panel', 'energy_panel', 'tech_core', 'empty'],
                '-x': ['metal_panel', 'energy_panel', 'tech_core', 'empty'],
                '+y': ['metal_panel', 'energy_panel', 'antenna', 'empty'],
                '-y': ['metal_panel', 'tech_core'],
                '+z': ['metal_panel', 'energy_panel', 'window_tech', 'empty'],
                '-z': ['metal_panel', 'energy_panel', 'window_tech', 'empty']
            }
        )
        tiles.append(metal)
        
        # Tech core
        tech_core = Tile(
            id='tech_core',
            name='Tech Core',
            model='cube',
            color='#FF6F00',
            adjacent_rules={
                '+x': ['tech_core', 'metal_panel', 'energy_panel', 'empty'],
                '-x': ['tech_core', 'metal_panel', 'energy_panel', 'empty'],
                '+y': ['tech_core', 'metal_panel', 'energy_panel', 'empty'],
                '-y': ['tech_core', 'metal_panel', 'energy_panel'],
                '+z': ['tech_core', 'metal_panel', 'energy_panel', 'empty'],
                '-z': ['tech_core', 'metal_panel', 'energy_panel', 'empty']
            }
        )
        tiles.append(tech_core)
        
        # Empty
        empty = Tile(
            id='empty',
            name='Empty',
            model='empty',
            color='#000000',
            adjacent_rules={
                '+x': ['energy_panel', 'metal_panel', 'tech_core', 'empty'],
                '-x': ['energy_panel', 'metal_panel', 'tech_core', 'empty'],
                '+y': ['energy_panel', 'metal_panel', 'tech_core', 'empty'],
                '-y': ['empty'],
                '+z': ['energy_panel', 'metal_panel', 'tech_core', 'empty'],
                '-z': ['energy_panel', 'metal_panel', 'tech_core', 'empty']
            }
        )
        tiles.append(empty)
        
        return {
            'style': 'futuristic',
            'name': 'Futuristic Structure',
            'description': 'Sci-fi architecture with energy panels',
            'tiles': tiles
        }
    
    @staticmethod
    def _generate_nature() -> Dict:
        """Nature/organic pattern"""
        tiles = []
        
        # Tree trunk
        trunk = Tile(
            id='trunk',
            name='Tree Trunk',
            model='cube',
            color='#6D4C41',
            adjacent_rules={
                '+x': ['trunk', 'bark', 'empty'],
                '-x': ['trunk', 'bark', 'empty'],
                '+y': ['trunk', 'branch', 'leaves', 'empty'],
                '-y': ['trunk', 'roots', 'ground'],
                '+z': ['trunk', 'bark', 'empty'],
                '-z': ['trunk', 'bark', 'empty']
            }
        )
        tiles.append(trunk)
        
        # Leaves
        leaves = Tile(
            id='leaves',
            name='Leaves',
            model='cube',
            color='#4CAF50',
            adjacent_rules={
                '+x': ['leaves', 'branch', 'empty'],
                '-x': ['leaves', 'branch', 'empty'],
                '+y': ['leaves', 'empty'],
                '-y': ['branch', 'trunk', 'leaves'],
                '+z': ['leaves', 'branch', 'empty'],
                '-z': ['leaves', 'branch', 'empty']
            }
        )
        tiles.append(leaves)
        
        # Branch
        branch = Tile(
            id='branch',
            name='Branch',
            model='cube',
            color='#795548',
            adjacent_rules={
                '+x': ['branch', 'leaves', 'empty'],
                '-x': ['branch', 'leaves', 'empty'],
                '+y': ['branch', 'leaves', 'empty'],
                '-y': ['trunk', 'branch'],
                '+z': ['branch', 'leaves', 'empty'],
                '-z': ['branch', 'leaves', 'empty']
            }
        )
        tiles.append(branch)
        
        # Ground
        ground = Tile(
            id='ground',
            name='Ground',
            model='cube',
            color='#8D6E63',
            adjacent_rules={
                '+x': ['ground', 'grass', 'roots', 'empty'],
                '-x': ['ground', 'grass', 'roots', 'empty'],
                '+y': ['grass', 'trunk', 'roots', 'empty'],
                '-y': ['empty'],
                '+z': ['ground', 'grass', 'roots', 'empty'],
                '-z': ['ground', 'grass', 'roots', 'empty']
            }
        )
        tiles.append(ground)
        
        # Grass
        grass = Tile(
            id='grass',
            name='Grass',
            model='cube',
            color='#66BB6A',
            adjacent_rules={
                '+x': ['grass', 'ground', 'empty'],
                '-x': ['grass', 'ground', 'empty'],
                '+y': ['empty'],
                '-y': ['ground'],
                '+z': ['grass', 'ground', 'empty'],
                '-z': ['grass', 'ground', 'empty']
            }
        )
        tiles.append(grass)
        
        # Empty
        empty = Tile(
            id='empty',
            name='Empty',
            model='empty',
            color='#E3F2FD',
            adjacent_rules={
                '+x': ['trunk', 'leaves', 'branch', 'grass', 'empty'],
                '-x': ['trunk', 'leaves', 'branch', 'grass', 'empty'],
                '+y': ['leaves', 'branch', 'empty'],
                '-y': ['ground', 'grass', 'empty'],
                '+z': ['trunk', 'leaves', 'branch', 'grass', 'empty'],
                '-z': ['trunk', 'leaves', 'branch', 'grass', 'empty']
            }
        )
        tiles.append(empty)
        
        return {
            'style': 'nature',
            'name': 'Natural Environment',
            'description': 'Trees, grass, and organic structures',
            'tiles': tiles
        }
    
    @staticmethod
    def get_available_styles() -> List[Dict]:
        """Get list of available procedural styles"""
        return [
            {
                'id': 'modern',
                'name': 'Modern Building',
                'description': 'Contemporary architecture with glass and concrete',
                'icon': '🏢',
                'difficulty': 'Medium'
            },
            {
                'id': 'medieval',
                'name': 'Medieval Castle',
                'description': 'Stone walls, towers, and battlements',
                'icon': '🏰',
                'difficulty': 'Hard'
            },
            {
                'id': 'futuristic',
                'name': 'Futuristic',
                'description': 'Sci-fi architecture with energy panels',
                'icon': '🚀',
                'difficulty': 'Medium'
            },
            {
                'id': 'nature',
                'name': 'Nature',
                'description': 'Trees, grass, and organic structures',
                'icon': '🌳',
                'difficulty': 'Easy'
            }
        ]



