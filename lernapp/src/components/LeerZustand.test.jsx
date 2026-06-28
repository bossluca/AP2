import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeerZustand from './LeerZustand';

const mitRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('LeerZustand', () => {
  it('zeigt Titel und Text', () => {
    mitRouter(<LeerZustand titel="Alles erledigt" text="Nichts mehr offen." />);
    expect(screen.getByText('Alles erledigt')).toBeInTheDocument();
    expect(screen.getByText('Nichts mehr offen.')).toBeInTheDocument();
  });

  it('rendert einen Link-CTA, wenn `to` gesetzt', () => {
    mitRouter(<LeerZustand titel="X" cta={{ label: 'Los', to: '/lernen' }} />);
    const link = screen.getByRole('link', { name: 'Los' });
    expect(link).toHaveAttribute('href', '/lernen');
  });

  it('ohne CTA kein Button/Link', () => {
    mitRouter(<LeerZustand titel="Nur Text" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
