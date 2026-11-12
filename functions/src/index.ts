

import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 10});


export {createTenant} from "./tenants/create-tenant";
