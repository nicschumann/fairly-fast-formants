import { Pole } from './data';
import * as math from 'mathjs';

export class FormantFilter {

    F : math.Matrix;
    P : math.Matrix;
    Q : math.Matrix;
    H : math.Matrix;
    R : math.Matrix;
    x_n_1 : math.Matrix;
    mu_x_n : math.Matrix;

    constructor () {

        const dt = 1; // 0.03 in hz/s, 1 in hz/f
        const dt2 = 0.5; // 0.00045 in hz/s^2, 0.5 in hz/f^2

        /**
         * F: State Update Matrix Construction
         */
        // constant Accelleration Model
        // This model is a 9x9 state update matrix.
        let F = math.matrix([
            [1, 0, 0, dt, 0, 0, dt2, 0, 0],
            [0, 1, 0, 0, dt, 0, 0, dt2, 0],
            [0, 0, 1, 0, 0, dt, 0, 0, dt2],
            [0, 0, 0, 1, 0, 0, dt, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, dt, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, dt],
            [0, 0, 0, 0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 1]
        ]);

        /**
         * It is initialized to the mean values of F1, F2, and F3.
         */
        // could be the average vocal "fingerprint "
        // for a specific user.
        let x_n_1 = math.matrix([
            [0],
            [0],
            [0],
            [0],
            [0],
            [0],
            [0],
            [0],
            [0],
        ]);

        /**
         * P: Covariance Matrix Construction
         */
        /**
         * This vector is the mean vector of the process. This 
         * Is collected from experimental data in the VTR Formants database.
         */
        let mu_x_n = math.matrix([
            [521.44739],
            [1593.67366],
            [2543.15536],
            [1.3524],
            [1.11827],
            [1.34155],
            [-0.0034398],
            [-0.0049924],
            [-0.0019122]
        ]);

        let x_sub_mu = <math.Matrix> math.subtract(x_n_1, mu_x_n)
        let P = <math.Matrix> math.multiply(x_sub_mu, math.transpose(x_sub_mu))

        /**
         * Q: Process Noise Matrix Construction
         */
        let Q_a = math.matrix([
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 3.2652, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 11.32244, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 10.51014],
        ])

        let Q = math.multiply(math.multiply(F, Q_a), math.transpose(F));

        /**
         * H: Observation Matrix Construction
         */
        let H = math.matrix([
            [1, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 0, 0]
        ])

        /**
         * R: Measurement Noise Matrix
         */
        let R = math.matrix([
            [35.3141, 0, 0],
            [0, 37.5898, 0],
            [0, 0, 30.7382]
        ])

        this.F = F;
        this.x_n_1 = x_n_1;
        this.mu_x_n = mu_x_n;
        this.P = P;
        this.Q = Q;
        this.H = H;
        this.R = R
    }

    preprocess(poles: Pole[]) {
        let frequencies = [[0], [0], [0]];

        poles.slice(0, 3).forEach((pole, i) => {
            frequencies[i] = [pole.frequency];
        })

        return math.matrix(frequencies);
    }

    update(z: math.Matrix) {
        // propogate the current state estimates using the model alone
        let x_n = math.multiply(this.F, this.x_n_1)
        let P_n = math.add(math.multiply(math.multiply(this.F, this.P), math.transpose(this.F)), this.Q)

        // calculate the Kalman gain for this observation.
        let PHt = math.multiply(P_n, math.transpose(this.H));
        let H_forward = <math.Matrix> math.add(math.multiply(math.multiply(this.H, P_n), math.transpose(this.H)), this.R)
        let H_inv = math.inv(H_forward);
        let K = math.multiply(PHt, H_inv);

        // update the state estimate using the observation and the kalman gain 
        let z_sub_x = math.subtract(z, math.multiply(this.H, x_n)); // also known as "innovation", lol.
        let x_n_prime = math.add(x_n, math.multiply(K, z_sub_x));
        let P_prime = math.subtract(P_n, math.multiply(K, math.multiply(this.H, P_n)))

        this.x_n_1 = <math.Matrix> x_n_prime;
        this.P = <math.Matrix> P_prime;

        return x_n_prime;
    }
}