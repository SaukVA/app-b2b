import { Money, type MoneyProps } from '../../../components/Money';
import { MoneyField, type MoneyFieldProps } from '../../../components/MoneyField';
import { useMoneyFormat } from '../useMoneyFormat';

// Envoltorios de Money y MoneyField con el formato del usuario (004, FR-011): son los que usan las
// pantallas de negocio para mostrar y pedir importes. Nunca para unidades o stock (FR-013).

export function UserMoney(props: Omit<MoneyProps, 'format'>) {
  return <Money {...props} format={useMoneyFormat()} />;
}

export function UserMoneyField(props: Omit<MoneyFieldProps, 'format'>) {
  return <MoneyField {...props} format={useMoneyFormat()} />;
}
