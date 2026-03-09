import { describe, it, expect } from 'vitest';
import {
  LAYOUT_TYPES,
  getWindowCount,
  isValidLayout,
  getPositions,
  getDisplayBounds,
  findDisplayForWindow,
  computeLayout,
  getGridDimensions,
  getWindowGridPosition,
  extractSplits,
  positionsFromSplits,
  recalculateLayout,
} from '../lib/layouts.js';

describe('LAYOUT_TYPES', () => {
  it('should contain all supported layouts', () => {
    expect(LAYOUT_TYPES).toEqual(['1x2', '2x1', '2x2', '3x2']);
  });
});

describe('isValidLayout', () => {
  it('should return true for valid layout types', () => {
    expect(isValidLayout('1x2')).toBe(true);
    expect(isValidLayout('2x1')).toBe(true);
    expect(isValidLayout('2x2')).toBe(true);
  });

  it('should return false for invalid layout types', () => {
    expect(isValidLayout('3x3')).toBe(false);
    expect(isValidLayout('')).toBe(false);
    expect(isValidLayout(null)).toBe(false);
    expect(isValidLayout(undefined)).toBe(false);
  });
});

describe('getWindowCount', () => {
  it('should return 2 for 1x2 layout', () => {
    expect(getWindowCount('1x2')).toBe(2);
  });

  it('should return 2 for 2x1 layout', () => {
    expect(getWindowCount('2x1')).toBe(2);
  });

  it('should return 4 for 2x2 layout', () => {
    expect(getWindowCount('2x2')).toBe(4);
  });

  it('should return 6 for 3x2 layout', () => {
    expect(getWindowCount('3x2')).toBe(6);
  });

  it('should return null for invalid layout', () => {
    expect(getWindowCount('invalid')).toBeNull();
  });
});

describe('getPositions', () => {
  const bounds = { left: 0, top: 0, width: 1920, height: 1080 };

  it('should return null for invalid layout type', () => {
    expect(getPositions(bounds, 'invalid')).toBeNull();
  });

  describe('1x2 layout', () => {
    it('should split into two columns', () => {
      const positions = getPositions(bounds, '1x2');
      expect(positions).toHaveLength(2);
      expect(positions[0]).toEqual({ left: 0, top: 0, width: 960, height: 1080 });
      expect(positions[1]).toEqual({ left: 960, top: 0, width: 960, height: 1080 });
    });

    it('should cover the full display width', () => {
      const positions = getPositions(bounds, '1x2');
      expect(positions[0].width + positions[1].width).toBe(bounds.width);
    });
  });

  describe('2x1 layout', () => {
    it('should split into two rows', () => {
      const positions = getPositions(bounds, '2x1');
      expect(positions).toHaveLength(2);
      expect(positions[0]).toEqual({ left: 0, top: 0, width: 1920, height: 540 });
      expect(positions[1]).toEqual({ left: 0, top: 540, width: 1920, height: 540 });
    });

    it('should cover the full display height', () => {
      const positions = getPositions(bounds, '2x1');
      expect(positions[0].height + positions[1].height).toBe(bounds.height);
    });
  });

  describe('2x2 layout', () => {
    it('should split into four quadrants', () => {
      const positions = getPositions(bounds, '2x2');
      expect(positions).toHaveLength(4);
      expect(positions[0]).toEqual({ left: 0, top: 0, width: 960, height: 540 });
      expect(positions[1]).toEqual({ left: 960, top: 0, width: 960, height: 540 });
      expect(positions[2]).toEqual({ left: 0, top: 540, width: 960, height: 540 });
      expect(positions[3]).toEqual({ left: 960, top: 540, width: 960, height: 540 });
    });

    it('should cover full display area', () => {
      const positions = getPositions(bounds, '2x2');
      const totalArea = positions.reduce((sum, p) => sum + p.width * p.height, 0);
      expect(totalArea).toBe(bounds.width * bounds.height);
    });
  });

  describe('3x2 layout', () => {
    it('should split into six panels (3 cols x 2 rows)', () => {
      const positions = getPositions(bounds, '3x2');
      expect(positions).toHaveLength(6);
    });

    it('should have correct column widths', () => {
      const positions = getPositions(bounds, '3x2');
      // 1920 / 3 = 640, last column gets remainder
      expect(positions[0].width).toBe(640);
      expect(positions[1].width).toBe(640);
      expect(positions[2].width).toBe(640);
    });

    it('should have correct row heights', () => {
      const positions = getPositions(bounds, '3x2');
      expect(positions[0].height).toBe(540);
      expect(positions[3].height).toBe(540);
    });

    it('should cover full display area', () => {
      const positions = getPositions(bounds, '3x2');
      const totalArea = positions.reduce((sum, p) => sum + p.width * p.height, 0);
      expect(totalArea).toBe(bounds.width * bounds.height);
    });

    it('should cover full width without gaps', () => {
      const positions = getPositions(bounds, '3x2');
      // Top row
      expect(positions[0].width + positions[1].width + positions[2].width).toBe(bounds.width);
    });

    it('should position top row then bottom row', () => {
      const positions = getPositions(bounds, '3x2');
      // Top row at y=0
      expect(positions[0].top).toBe(0);
      expect(positions[1].top).toBe(0);
      expect(positions[2].top).toBe(0);
      // Bottom row at y=540
      expect(positions[3].top).toBe(540);
      expect(positions[4].top).toBe(540);
      expect(positions[5].top).toBe(540);
    });

    it('should handle odd width (1921) without gaps', () => {
      const oddBounds = { left: 0, top: 0, width: 1921, height: 1080 };
      const positions = getPositions(oddBounds, '3x2');
      expect(positions[0].width + positions[1].width + positions[2].width).toBe(1921);
    });
  });

  describe('with offset bounds', () => {
    it('should respect display offset for 1x2', () => {
      const offsetBounds = { left: 1920, top: 100, width: 1920, height: 1080 };
      const positions = getPositions(offsetBounds, '1x2');
      expect(positions[0].left).toBe(1920);
      expect(positions[1].left).toBe(1920 + 960);
      expect(positions[0].top).toBe(100);
    });
  });

  describe('with odd dimensions', () => {
    it('should handle odd width without gaps', () => {
      const oddBounds = { left: 0, top: 0, width: 1921, height: 1080 };
      const positions = getPositions(oddBounds, '1x2');
      expect(positions[0].width + positions[1].width).toBe(1921);
    });

    it('should handle odd height without gaps', () => {
      const oddBounds = { left: 0, top: 0, width: 1920, height: 1081 };
      const positions = getPositions(oddBounds, '2x1');
      expect(positions[0].height + positions[1].height).toBe(1081);
    });
  });
});

describe('getDisplayBounds', () => {
  it('should extract workArea from a DisplayInfo object', () => {
    const displayInfo = {
      bounds: { left: 0, top: 0, width: 1920, height: 1080 },
      workArea: { left: 0, top: 0, width: 1920, height: 1040 },
    };
    expect(getDisplayBounds(displayInfo)).toEqual({ left: 0, top: 0, width: 1920, height: 1040 });
  });

  it('should handle workArea with offset (taskbar on left)', () => {
    const displayInfo = {
      bounds: { left: 0, top: 0, width: 1920, height: 1080 },
      workArea: { left: 48, top: 0, width: 1872, height: 1080 },
    };
    expect(getDisplayBounds(displayInfo)).toEqual({ left: 48, top: 0, width: 1872, height: 1080 });
  });
});

describe('findDisplayForWindow', () => {
  const primary = {
    id: 'primary',
    bounds: { left: 0, top: 0, width: 1920, height: 1080 },
    workArea: { left: 0, top: 0, width: 1920, height: 1040 },
  };
  const secondary = {
    id: 'secondary',
    bounds: { left: 1920, top: 0, width: 2560, height: 1440 },
    workArea: { left: 1920, top: 0, width: 2560, height: 1400 },
  };

  it('should return primary when window is on it', () => {
    expect(findDisplayForWindow([primary, secondary], { left: 100, top: 200 }).id).toBe('primary');
  });

  it('should return secondary when window is on it', () => {
    expect(findDisplayForWindow([primary, secondary], { left: 2000, top: 100 }).id).toBe('secondary');
  });

  it('should fall back to first display if no match', () => {
    expect(findDisplayForWindow([primary, secondary], { left: -500, top: -500 }).id).toBe('primary');
  });
});

describe('computeLayout', () => {
  const displays = [
    {
      id: 'primary',
      bounds: { left: 0, top: 0, width: 1920, height: 1080 },
      workArea: { left: 0, top: 0, width: 1920, height: 1040 },
    },
  ];

  it('should compute positions using workArea', () => {
    const positions = computeLayout(displays, { left: 100, top: 100 }, '1x2');
    expect(positions).toHaveLength(2);
    expect(positions[0].height).toBe(1040);
  });

  it('should return null for invalid layout', () => {
    expect(computeLayout(displays, { left: 0, top: 0 }, 'invalid')).toBeNull();
  });

  it('should return null for empty displays', () => {
    expect(computeLayout([], { left: 0, top: 0 }, '1x2')).toBeNull();
  });

  it('should return null for null displays', () => {
    expect(computeLayout(null, { left: 0, top: 0 }, '1x2')).toBeNull();
  });
});

// --- Dynamic resize tests ---

describe('getGridDimensions', () => {
  it('should return { cols: 2, rows: 1 } for 1x2', () => {
    expect(getGridDimensions('1x2')).toEqual({ cols: 2, rows: 1 });
  });

  it('should return { cols: 1, rows: 2 } for 2x1', () => {
    expect(getGridDimensions('2x1')).toEqual({ cols: 1, rows: 2 });
  });

  it('should return { cols: 2, rows: 2 } for 2x2', () => {
    expect(getGridDimensions('2x2')).toEqual({ cols: 2, rows: 2 });
  });

  it('should return { cols: 3, rows: 2 } for 3x2', () => {
    expect(getGridDimensions('3x2')).toEqual({ cols: 3, rows: 2 });
  });

  it('should return null for invalid layout', () => {
    expect(getGridDimensions('invalid')).toBeNull();
  });
});

describe('getWindowGridPosition', () => {
  it('should return (0,0) for index 0 in 2-col grid', () => {
    expect(getWindowGridPosition(0, 2)).toEqual({ row: 0, col: 0 });
  });

  it('should return (0,1) for index 1 in 2-col grid', () => {
    expect(getWindowGridPosition(1, 2)).toEqual({ row: 0, col: 1 });
  });

  it('should return (1,0) for index 2 in 2-col grid', () => {
    expect(getWindowGridPosition(2, 2)).toEqual({ row: 1, col: 0 });
  });

  it('should return (1,2) for index 5 in 3-col grid', () => {
    expect(getWindowGridPosition(5, 3)).toEqual({ row: 1, col: 2 });
  });
});

describe('extractSplits', () => {
  const display = { left: 0, top: 0, width: 1920, height: 1080 };

  it('should extract splitX from 1x2 left window resize', () => {
    // Left window made wider: 1100px instead of 960
    const result = extractSplits(0, { left: 0, top: 0, width: 1100, height: 1080 }, display, '1x2');
    expect(result.splitX).toEqual([1100]);
    expect(result.splitY).toEqual([]);
  });

  it('should extract splitX from 1x2 right window resize', () => {
    // Right window moved left: starts at 800
    const result = extractSplits(1, { left: 800, top: 0, width: 1120, height: 1080 }, display, '1x2');
    expect(result.splitX).toEqual([800]);
  });

  it('should extract splitY from 2x1 top window resize', () => {
    const result = extractSplits(0, { left: 0, top: 0, width: 1920, height: 600 }, display, '2x1');
    expect(result.splitY).toEqual([600]);
  });

  it('should extract both splits from 2x2 bottom-right window', () => {
    // Bottom-right made wider and taller (starts at 800, 400)
    const result = extractSplits(3, { left: 800, top: 400, width: 1120, height: 680 }, display, '2x2');
    expect(result.splitX).toEqual([800]);
    expect(result.splitY).toEqual([400]);
  });

  it('should extract splits from 2x2 top-left window', () => {
    // Top-left made wider (1100px) and taller (600px)
    const result = extractSplits(0, { left: 0, top: 0, width: 1100, height: 600 }, display, '2x2');
    expect(result.splitX).toEqual([1100]);
    expect(result.splitY).toEqual([600]);
  });

  it('should return null for invalid layout', () => {
    expect(extractSplits(0, { left: 0, top: 0, width: 100, height: 100 }, display, 'invalid')).toBeNull();
  });
});

describe('positionsFromSplits', () => {
  const display = { left: 0, top: 0, width: 1920, height: 1080 };

  it('should compute 1x2 positions from splitX', () => {
    const positions = positionsFromSplits({ splitX: [1100], splitY: [] }, display, '1x2');
    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({ left: 0, top: 0, width: 1100, height: 1080 });
    expect(positions[1]).toEqual({ left: 1100, top: 0, width: 820, height: 1080 });
  });

  it('should compute 2x2 positions from splits', () => {
    const positions = positionsFromSplits({ splitX: [800], splitY: [400] }, display, '2x2');
    expect(positions).toHaveLength(4);
    expect(positions[0]).toEqual({ left: 0, top: 0, width: 800, height: 400 });
    expect(positions[1]).toEqual({ left: 800, top: 0, width: 1120, height: 400 });
    expect(positions[2]).toEqual({ left: 0, top: 400, width: 800, height: 680 });
    expect(positions[3]).toEqual({ left: 800, top: 400, width: 1120, height: 680 });
  });

  it('should compute 3x2 positions from splits', () => {
    const positions = positionsFromSplits({ splitX: [640, 1280], splitY: [540] }, display, '3x2');
    expect(positions).toHaveLength(6);
    // Top row
    expect(positions[0].width).toBe(640);
    expect(positions[1].width).toBe(640);
    expect(positions[2].width).toBe(640);
    // Bottom row
    expect(positions[3].top).toBe(540);
    expect(positions[4].top).toBe(540);
    expect(positions[5].top).toBe(540);
  });

  it('should cover full display area', () => {
    const positions = positionsFromSplits({ splitX: [800], splitY: [400] }, display, '2x2');
    const totalArea = positions.reduce((sum, p) => sum + p.width * p.height, 0);
    expect(totalArea).toBe(1920 * 1080);
  });
});

describe('recalculateLayout', () => {
  const display = { left: 0, top: 0, width: 1920, height: 1080 };

  it('should recalculate 2x2 when bottom-right is made wider', () => {
    // Bottom-right starts at x=800 (was 960), making it wider
    const positions = recalculateLayout(3, { left: 800, top: 540, width: 1120, height: 540 }, display, '2x2');
    // All windows should share the same vertical split at x=800
    expect(positions[0].width).toBe(800);  // top-left shrinks
    expect(positions[1].left).toBe(800);   // top-right moves left
    expect(positions[1].width).toBe(1120); // top-right grows
    expect(positions[2].width).toBe(800);  // bottom-left shrinks
    expect(positions[3].left).toBe(800);   // bottom-right stays
  });

  it('should recalculate 2x2 when top-left is made taller', () => {
    // Top-left height goes from 540 to 700
    const positions = recalculateLayout(0, { left: 0, top: 0, width: 960, height: 700 }, display, '2x2');
    // Horizontal split moves to y=700
    expect(positions[0].height).toBe(700); // top-left
    expect(positions[1].height).toBe(700); // top-right also taller
    expect(positions[2].top).toBe(700);    // bottom-left starts lower
    expect(positions[2].height).toBe(380); // bottom-left shrinks
    expect(positions[3].top).toBe(700);    // bottom-right starts lower
    expect(positions[3].height).toBe(380); // bottom-right shrinks
  });

  it('should maintain full coverage after recalculation', () => {
    const positions = recalculateLayout(0, { left: 0, top: 0, width: 1100, height: 600 }, display, '2x2');
    const totalArea = positions.reduce((sum, p) => sum + p.width * p.height, 0);
    expect(totalArea).toBe(1920 * 1080);
  });

  it('should recalculate 1x2 when left window is resized', () => {
    const positions = recalculateLayout(0, { left: 0, top: 0, width: 1200, height: 1080 }, display, '1x2');
    expect(positions[0].width).toBe(1200);
    expect(positions[1].left).toBe(1200);
    expect(positions[1].width).toBe(720);
  });

  it('should recalculate 3x2 when center-top is made wider', () => {
    // Center-top: starts at 500 (was 640), width 900 (was 640), ends at 1400 (was 1280)
    const positions = recalculateLayout(1, { left: 500, top: 0, width: 900, height: 540 }, display, '3x2');
    expect(positions[0].width).toBe(500);  // left column shrinks
    expect(positions[1].left).toBe(500);   // center shifts
    expect(positions[1].width).toBe(900);  // center wider
    expect(positions[2].left).toBe(1400);  // right column shifts
    expect(positions[2].width).toBe(520);  // right column shrinks
    // Bottom row matches
    expect(positions[3].width).toBe(500);
    expect(positions[4].left).toBe(500);
    expect(positions[5].left).toBe(1400);
  });

  it('should return null for invalid layout', () => {
    expect(recalculateLayout(0, { left: 0, top: 0, width: 100, height: 100 }, display, 'invalid')).toBeNull();
  });
});
