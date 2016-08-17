function mainController(
	$scope,
	$rootScope,
	$firebaseAuth,
	$firebaseObject,
	$firebaseArray,
	firebaseService,
	backendService,
	userService,
	toastr
	){

	// ----------------------------------------------------------------
	// BOOTSTRAPPING + VARS
	// -------------

	// connect to firebase
	firebaseService.initialise();

	// set my user metadata to null/undefined
	this.userSignedIn = null;
	this.username = userService.currentUsername();
	this.displayImgSrc = userService.currentAvatar();
	this.userUid = userService.currentUid();
	$scope.userWidgetMeta = null;

	// grab an instance of the firebase getAuth method
	this.auth = firebaseService.getAuth();

	// -----------------------------------------------------------------
	// CHECK AND LOG IN PRIOR SESSION
	// -----------------------------

	// listener which fires when the users state changes from null, guest, or logged in
	this.auth.$onAuthStateChanged((userDetails) => {
		// if user is an actually, previously logged in user
		if (userDetails){

			let firebaseAuthPromise = firebase.auth().getToken(true);
			let authTokenPromise = backendService.authenticateToken;
			let returningWidgetsPromise = firebaseService.getWidgets;

			// promises are s w e e t !
			firebaseAuthPromise
				.then((idToken) => backendService.authenticateToken(idToken))
				.then((userCreds) => {
					this.userSignedIn = userCreds.name ? true : false;
					this.username = userService.currentUsername(userCreds.name);
					this.displayImgSrc = userService.currentAvatar(userCreds.picture);
					this.userUid = userService.currentUid(userCreds.uid);
				})
				.then(() => {
					return returningWidgetsPromise(this.userUid)
				})
				.then((snapshot) => {
					$scope.userWidgetMeta = $firebaseObject(snapshot);
					toastr.success("Welcome back  " + this.username, "Signed in");
				})
				.catch((error) => {
					console.log(error);
				})
		}

		// if user is a guest
		if (userDetails === null){

			let guestPromise = firebaseService.logInAsGuest;
			let getWidgetPromise = firebaseService.getWidgets;

			// son, go over the hill and tell me if i can go fishing
			guestPromise()
				.then((response) => {
					this.username = userService.currentUsername()
					this.displayImgSrc = userService.currentAvatar();
				})
				.then(() => getWidgetPromise(this.userUid))
				.then((widgetsMeta) => {
					$scope.userWidgetMeta = $firebaseObject(widgetsMeta)
				})
				.catch((error) => {
					console.log(error);
				})
		}
	});


	// ----------------------------------------------------------------------
	// BROADCAST / EMIT EVENTS
	// -----------------------

	// sign in button clicked, bring up google oAuth screen
	$rootScope.$on("signUserIn", () => {

		let googlePromise = firebaseService.logInWithGoogle;
		let createUserPromise = firebaseService.createUser;
		let getWidgetPromise = firebaseService.getWidgets;

		googlePromise()
			.then((response) => {
				createUserPromise(response);
				this.username = userService.currentUsername(response.user.displayName);
				this.displayImgSrc = userService.currentUsername(response.user.photoURL);
				this.userUid = userService.currentUsername(response.user.uid);

			})
			.then(() => getWidgetPromise(this.userUid))
			.then((widgetsMeta) => {
				$scope.userWidgetMeta = $firebaseObject(widgetsMeta);
			})
			.catch((error) => {
				console.log(error);
			})

	});

	// remove the user
	$rootScope.$on("signUserOut", () => {
		toastr.info("Signing out...");
		this.auth.$signOut();
	});

	// write an update to the db (when user adds stuff)
	$rootScope.$on("writeToFirebase", (event, whatToWrite, payload) => {
		let writePromise = firebaseService.updateWidget;
		writePromise(whatToWrite, payload, this.userUid)
	});

	// deletes a widgets stuff
	$rootScope.$on("deleteWidgetMeta", (event, widgetName) => {
		let deletePromise = firebaseService.deleteWidget;
		deletePromise(widgetName, this.userUid);
	});

}

// Inject so when it's minified it doesn't go mental
mainController.$inject = [
	"$scope",
	"$rootScope",
	"$firebaseAuth",
	"$firebaseObject",
	"$firebaseArray",
	"firebaseService",
	"backendService",
	"userService",
	"toastr"
];

// send to main.js
export default mainController;