import { describe, it, expect } from 'vitest';
import {
  LAYOUT_TYPES,
  getWindowCount,
  isValidLayout,
  getPositions,
  getDisplayBounds,
  findDisplayForWindow,
  computeLayout,
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
