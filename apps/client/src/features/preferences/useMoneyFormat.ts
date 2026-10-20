import { DEFAULT_MONEY_FORMAT, type MoneyFormat } from '@app/shared';
import { useAppSelector } from '../../store/store';

/** Formato de importes del usuario; sin sesión, el formato por defecto (FR-010). */
export function useMoneyFormat(): MoneyFormat {
  return useAppSelector((state) => state.preferences.applied?.moneyFormat ?? DEFAULT_MONEY_FORMAT);
}
