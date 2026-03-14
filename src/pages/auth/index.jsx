import { Switch, Route } from "wouter";

import Splash from "./Splash";

const Auth = () => {
	return (
		<Switch>
			<Route path="/" component={Splash} />
		</Switch>
	);
};

export default Auth;
