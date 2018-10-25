import { getConnection } from 'typeorm';

export const handleHealthCheck = () => {
    // execute a simple 'not data dependent' query on the database 
    // to verify our connection is live. works across postgres restarts.
    return getConnection().query('SELECT now()');
}