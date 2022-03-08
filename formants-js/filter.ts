import * as math from 'mathjs';

export class FormantFilter {

    F : math.Matrix;
    P : math.Matrix;
    Q : math.Matrix;
    H : math.Matrix;
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
        let x_n_1 = math.matrix([
            [0.52144739],
            [1.59367366],
            [2.54315536],
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
            [0.52144739],
            [1.59367366],
            [2.54315536],
            [0.0013524],
            [0.00111827],
            [0.00134155],
            [-0.00034398],
            [-0.00049924],
            [-0.00019122]
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
            [0, 0, 0, 0, 0, 0, 0.0032652, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0.01132244, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0.01051014],
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

        this.F = F;
        this.x_n_1 = x_n_1;
        this.mu_x_n = mu_x_n;
        this.P = P;
        this.Q = Q;
        this.H = H;
    }

    update_state() {
        let x_n = math.multiply(this.F, this.x_n_1);
        return x_n;
    }

    update_uncertainty() {
        let P_prime = math.multiply(math.multiply(this.F, this.P), math.transpose(this.F));
        P_prime = <math.Matrix> math.add(P_prime, this.Q);

        console.log(P_prime);

        this.P = P_prime;   
    }




}