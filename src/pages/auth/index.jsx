import { Route, Switch } from "wouter";
import OAuth from "./OAuth";
import OnboardReturn from "./OnboardReturn";
import Splash from "./Splash";
import StripeOnboard from "./StripeOnboard";

const Auth = () => {
	return (
		<Switch>
			<Route path="/" component={Splash} />
			<Route path="/oauth" component={OAuth} />
			<Route path="/stripe-onboard" component={StripeOnboard} />
			<Route path="/onboard-return" component={OnboardReturn} />
			{/* Any other path while logged out (a bookmarked/shared deep link)
			    falls back to the login screen instead of a blank page. */}
			<Route component={Splash} />
		</Switch>
	);
};

export default Auth;
