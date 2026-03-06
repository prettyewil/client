import axios from 'axios';
import Swal from 'sweetalert2';

const setupAxiosInterceptors = () => {
    // Set base URL from environment variable if available
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

    // Response interceptor
    axios.interceptors.response.use(
        (response) => {
            return response;
        },
        (error) => {
            if (axios.isAxiosError(error)) {

                // Handle 401 Unauthorized (Token expired/invalid)
                if (error.response?.status === 401) {
                    // Start dispatching logout or simple redirect
                    // Since we can't easily access AuthContext outside of a component, 
                    // we might need to rely on the fact that the token is invalid and next request will fail or 
                    // manually clear storage and redirect.

                    // Only redirect if not already on login page to avoid loops
                    if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
                        // Prevent infinite loop if 401 happens on login page
                        console.warn('Session expired. Redirecting to login.');
                        localStorage.removeItem('token'); // Clear token
                        // window.location.href = '/'; // Force redirect
                    }
                }

                // Handle 403 Forbidden
                if (error.response?.status === 403) {
                    // specific 403 handling if needed, maybe a toast
                }

                // Global Generic Error Toast (Optional: avoid for 404s or handled errors)
                // We can check a custom config logic if we want to skip global error handling for specific requests
                const expectedError = error.response && error.response.status >= 400 && error.response.status < 500;

                if (!expectedError) {
                    // Network errors or 5xx errors
                    console.error('Global API Error:', error);
                    // Swal.fire({
                    //    icon: 'error',
                    //    title: 'Server Error',
                    //    text: 'Something went wrong. Please try again later.',
                    //    toast: true,
                    //    position: 'top-end',
                    //    showConfirmButton: false,
                    //    timer: 3000
                    // });
                }
            } else {
                console.error('An unexpected error occurred', error);
            }

            return Promise.reject(error);
        }
    );
};

export default setupAxiosInterceptors;
