import { useMemo } from 'react';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { getLernobjekte } from '../data/lernobjekte';
import { berechneStatistik } from '../lib/statistik';
import { bewerteErfolge, baueErfolgKontext } from '../lib/erfolge';
import { baueWochenChallenges } from '../lib/challenges';
import { ladeEinstufung } from '../lib/einstufung';
import { ladeStapel } from '../lib/eigeneKarten';

/**
 * Alle Erfolge mit Freischalt-Status – eine Datenbasis für Statistik-Seite und
 * ErfolgWatcher. Einstufung/eigene Stapel kommen aus dem localStorage und
 * werden bei jeder Fortschrittsänderung neu gelesen (beide Aktionen bewerten
 * Lernobjekte und ändern damit den Fortschritt).
 */
export function useErfolge() {
  const { progress } = useProgress();
  const { gami } = useGamification();
  const objekte = useMemo(() => getLernobjekte(), []);
  const statistik = useMemo(() => berechneStatistik(objekte, progress), [objekte, progress]);
  return useMemo(() => {
    const challenges = baueWochenChallenges({ activity: gami.activity, progress, objekte });
    return bewerteErfolge(
      baueErfolgKontext(statistik, gami, {
        einstufungGemacht: Boolean(ladeEinstufung()),
        eigeneStapel: ladeStapel().length,
        challenges,
      })
    );
  }, [statistik, gami, progress, objekte]);
}
