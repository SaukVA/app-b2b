import { BrandMark } from '../../../components/BrandMark';
import styles from './LoginHero.module.css';

/** Panel oscuro de presentación; por debajo de 760 px queda reducido a una franja con la marca. */
export function LoginHero() {
  return (
    <section className={styles.hero} aria-label="Presentación">
      <BrandMark name="Venta a mayoristas" size="lg" />
      <div className={styles.claim}>
        <span className={styles.kicker}>PEDIDOS · STOCK · COBROS</span>
        <h1 className={styles.title}>Todo el ciclo de venta, en una sola hoja.</h1>
        <p className={styles.lead}>
          Del pedido del cliente al cobro de la factura, con el stock y las tarifas siempre al día, en la
          oficina o en el almacén.
        </p>
      </div>
      <div className={styles.footer}>Web y escritorio</div>
    </section>
  );
}
