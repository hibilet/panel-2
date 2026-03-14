import { Route, Switch } from "wouter";
import OAuth from "./OAuth";
import Splash from "./Splash";

const Auth = () => {
	return (
		<Switch>
			<Route path="/" component={Splash} />
			<Route path="/oauth" component={OAuth} />
		</Switch>
	);
};

export default Auth;
