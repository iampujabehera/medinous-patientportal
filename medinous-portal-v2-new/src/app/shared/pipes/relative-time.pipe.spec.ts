import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    pipe = new RelativeTimePipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "Just now" for current time', () => {
    expect(pipe.transform(new Date())).toBe('Just now');
  });

  it('should return minutes ago for recent times', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(pipe.transform(fiveMinAgo)).toBe('5m ago');
  });

  it('should return hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(pipe.transform(threeHoursAgo)).toBe('3h ago');
  });

  it('should return days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoDaysAgo)).toBe('2d ago');
  });

  it('should return weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoWeeksAgo)).toBe('2w ago');
  });

  it('should return full date for old dates (30+ days)', () => {
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const result = pipe.transform(oldDate);
    // Should be a formatted date string, not relative
    expect(result).not.toContain('ago');
    expect(result).not.toBe('Just now');
  });

  it('should accept string dates', () => {
    const result = pipe.transform(new Date().toISOString());
    expect(result).toBe('Just now');
  });

  it('should handle ISO string dates', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(pipe.transform(fiveMinAgo)).toBe('5m ago');
  });
});
