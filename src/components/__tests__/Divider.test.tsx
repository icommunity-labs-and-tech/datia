import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Divider } from '../Divider';

describe('Divider', () => {
  it('should render hr element with correct classes', () => {
    const { container } = render(<Divider />);
    const hrElement = container.firstChild as HTMLElement;
    
    expect(hrElement.tagName).toBe('HR');
    expect(hrElement).toHaveClass('my-3', 'border-gray', 'opacity-50');
  });

  it('should be a self-closing element', () => {
    const { container } = render(<Divider />);
    const hrElement = container.firstChild as HTMLElement;
    
    expect(hrElement.children).toHaveLength(0);
  });
});

