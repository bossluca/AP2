import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTastenkuerzel } from './useTastenkuerzel';

function Harness({ belegung, aktiv }) {
  useTastenkuerzel(belegung, { aktiv });
  return (
    <div>
      <input aria-label="feld" />
    </div>
  );
}

describe('useTastenkuerzel', () => {
  it('ruft den Handler zur passenden Taste auf', async () => {
    const user = userEvent.setup();
    const space = vi.fn();
    render(<Harness belegung={{ ' ': space }} />);
    await user.keyboard(' ');
    expect(space).toHaveBeenCalledTimes(1);
  });

  it('ignoriert Tasten in Eingabefeldern', async () => {
    const user = userEvent.setup();
    const eins = vi.fn();
    const { getByLabelText } = render(<Harness belegung={{ 1: eins }} />);
    getByLabelText('feld').focus();
    await user.keyboard('1');
    expect(eins).not.toHaveBeenCalled();
  });

  it('lässt Modifier-Kombinationen (Strg/Cmd) durch', async () => {
    const user = userEvent.setup();
    const fn = vi.fn();
    render(<Harness belegung={{ k: fn }} />);
    await user.keyboard('{Control>}k{/Control}');
    expect(fn).not.toHaveBeenCalled();
  });

  it('reagiert nicht mehr, wenn aktiv=false', async () => {
    const user = userEvent.setup();
    const fn = vi.fn();
    render(<Harness belegung={{ x: fn }} aktiv={false} />);
    await user.keyboard('x');
    expect(fn).not.toHaveBeenCalled();
  });
});
