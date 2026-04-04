import { Route, Switch } from "wouter";
import OAuth from "./OAuth";
import Splash from "./Splash";
import StripeOnboard from "./StripeOnboard";

const Auth = () => {
	return (
		<Switch>
			<Route path="/" component={Splash} />
			<Route path="/oauth" component={OAuth} />
			<Route path="/stripe-onboard" component={StripeOnboard} />
		</Switch>
	);
};

export default Auth;
