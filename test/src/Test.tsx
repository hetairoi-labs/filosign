import { useFilosignContext } from "@filosign/react";
import {
	useAckFile,
	useApproveSender,
	useCanReceiveFrom,
	useCanSendTo,
	useFileInfo,
	useIsLoggedIn,
	useIsRegistered,
	useLogin,
	useLogout,
	useReceivedFiles,
	useSendFile,
	useSentFiles,
	useSignFile,
	useUserProfile,
	useUserProfileByQuery,
	useViewFile,
} from "@filosign/react/hooks";
import { useId, useMemo, useState } from "react";
import { useOtherAddress, useOtherReload } from "./App";
import Button from "./Button";
import { dummyBytes } from "./dumy";
import { useEffectOnce } from "./hooks/useEffectOnce";
import { useSet } from "./hooks/useSet";
import { useTimeout } from "./hooks/useTimeout";
import {
	type FileValidationError,
	isValidEthereumAddress,
	parseEthereumAddress,
	parseFileStatus,
	parseString,
	RELOAD_DELAY_MS,
	TEST_PIN,
	validateFile,
} from "./lib/validation";
import SignWithIDKit from "./world/IDKitTest";

type TestName =
	| "login"
	| "check-this-user-info"
	| "check-other-user-info"
	| "approve-sender"
	| "check-send"
	| "file-send"
	| "file-sign";
type NotifierFn = (name: TestName) => void;

export default function TestPage() {
	const { ready } = useFilosignContext();
	const logout = useLogout();
	const isLoggedIn = useIsLoggedIn();

	// Use Set for O(1) lookups instead of O(N) array operations
	const { add: markDone, has: isDone } = useSet<TestName>();

	const notifyDone = (name: TestName) => {
		markDone(name);
	};

	return (
		ready && (
			<div className="flex flex-col gap-4">
				<TestLogin notify={notifyDone} />

				{isLoggedIn.data === true && (
					<div className="space-y-4">
						{isDone("login") && <TestThisUserInfo notify={notifyDone} />}

						{isDone("check-this-user-info") && (
							<TestApproveSender notify={notifyDone} />
						)}

						{isDone("approve-sender") && (
							<TestOtherUserInfo notify={notifyDone} />
						)}

						{isDone("check-other-user-info") && (
							<TestCheckCanSendTo notify={notifyDone} />
						)}

						{isDone("check-send") && (
							<div className="space-y-4">
								<TestFileSend notify={notifyDone} />
								<ShowReceivedFiles />
								<ShowSentFiles />
							</div>
						)}
					</div>
				)}

				<section className="p-4">
					<Button mutation={logout}>Logout</Button>
				</section>
			</div>
		)
	);
}

function TestLogin(props: { notify: NotifierFn }) {
	const { notify } = props;

	const login = useLogin();
	const isRegistered = useIsRegistered();
	const isLoggedIn = useIsLoggedIn();

	useEffectOnce(() => {
		if (isRegistered.data === false) {
			login.mutate({ pin: TEST_PIN });
		}
	}, [isRegistered.data]);
	useEffectOnce(() => {
		if (isLoggedIn.data === false) {
			login.mutate({ pin: TEST_PIN });
		}
	}, [isLoggedIn.data]);

	useEffectOnce(() => {
		notify("login");
	}, [login.isSuccess]);
	useEffectOnce(() => {
		if (isLoggedIn.data === true) {
			notify("login");
		}
	}, [isLoggedIn.data]);

	// Get readable error message
	const getErrorMessage = (error: Error | null): string => {
		if (!error) return "Unknown error";
		if (error.message) return error.message;
		return String(error);
	};

	return (
		<section
			className="p-4 space-y-2 max-w-4xl"
			aria-labelledby="login-heading"
		>
			<h2 id="login-heading" className="text-lg font-semibold">
				Login Test
			</h2>

			{isLoggedIn.data === false && (
				<Button mutation={login} mutationArgs={{ pin: TEST_PIN }}>
					Login
				</Button>
			)}

			{login.isPending && (
				<p className="text-gray-600" aria-live="polite">
					Logging in...
				</p>
			)}

			{login.isError && (
				<p
					className="text-red-700 bg-red-50 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Login error:</strong> {getErrorMessage(login.error)}
				</p>
			)}

			{login.isSuccess && (
				<p
					className="text-green-700 bg-green-50 p-2 rounded"
					aria-live="polite"
				>
					Logged in successfully!
				</p>
			)}

			<dl className="grid grid-cols-2 gap-2 text-sm">
				<dt className="text-gray-600">Is Registered:</dt>
				<dd>{isRegistered.data ? "Yes" : "No"}</dd>
				<dt className="text-gray-600">Is Logged In:</dt>
				<dd>{isLoggedIn.data ? "Yes" : "No"}</dd>
			</dl>
		</section>
	);
}

function TestApproveSender(props: { notify: NotifierFn }) {
	const { notify } = props;

	const otherAddress = useOtherAddress();
	const approveSender = useApproveSender();
	const canReceiveFrom = useCanReceiveFrom({ sender: otherAddress });
	const { reload: otherReload } = useOtherReload();
	const { setSafeTimeout, clearSafeTimeout } = useTimeout();

	useEffectOnce(() => {
		if (canReceiveFrom.data === false) {
			approveSender.mutate({
				sender: otherAddress,
			});

			setSafeTimeout(() => {
				otherReload();
			}, RELOAD_DELAY_MS);
		}

		// Cleanup function for effect
		return () => {
			clearSafeTimeout();
		};
	}, [canReceiveFrom.data]);

	useEffectOnce(() => {
		if (canReceiveFrom.data) {
			notify("approve-sender");
		}
	}, [canReceiveFrom.data]);

	useEffectOnce(() => {
		notify("approve-sender");
	}, [approveSender.isSuccess]);

	const getErrorMessage = (error: Error | null): string => {
		if (!error) return "Unknown error";
		if (error.message) return error.message;
		return String(error);
	};

	return (
		<section
			className="p-4 space-y-2 max-w-4xl"
			aria-labelledby="approve-sender-heading"
		>
			<h2 id="approve-sender-heading" className="text-lg font-semibold">
				Approve Sender Test
			</h2>

			{canReceiveFrom.data === true && (
				<p
					className="text-green-700 bg-green-50 p-2 rounded"
					aria-live="polite"
				>
					Can already receive from sender.
				</p>
			)}

			{approveSender.isPending && (
				<p className="text-gray-600" aria-live="polite">
					Approving sender...
				</p>
			)}

			{approveSender.isError && (
				<p
					className="text-red-700 bg-red-50 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Approve sender error:</strong>{" "}
					{getErrorMessage(approveSender.error)}
				</p>
			)}

			{approveSender.isSuccess && (
				<p
					className="text-green-700 bg-green-50 p-2 rounded"
					aria-live="polite"
				>
					Sender approved successfully!
				</p>
			)}
		</section>
	);
}

function TestCheckCanSendTo(props: { notify: NotifierFn }) {
	const { notify } = props;

	const otherAddress = useOtherAddress();
	const canSendTo = useCanSendTo({ recipient: otherAddress });

	useEffectOnce(() => {
		if (canSendTo.data === true) {
			notify("check-send");
		}
	}, [canSendTo.data]);
	useEffectOnce(() => {
		notify("check-send");
	}, [canSendTo.isSuccess]);

	return (
		<section
			className="p-4 space-y-2 max-w-4xl"
			aria-labelledby="check-send-heading"
		>
			<h2 id="check-send-heading" className="text-lg font-semibold">
				Check Send Permission Test
			</h2>

			{canSendTo.isPending && (
				<p className="text-gray-600" aria-live="polite">
					Checking if can receive from sender...
				</p>
			)}

			{canSendTo.data === true && (
				<p
					className="text-green-700 bg-green-50 p-2 rounded"
					aria-live="polite"
				>
					Can receive from sender.
				</p>
			)}

			{canSendTo.data === false && (
				<p className="text-red-700 bg-red-50 p-2 rounded" aria-live="polite">
					Cannot receive from sender.
				</p>
			)}
		</section>
	);
}

function TestThisUserInfo(props: { notify: NotifierFn }) {
	const { notify } = props;
	const selfProfile = useUserProfile();

	useEffectOnce(() => {
		if (selfProfile.data) {
			notify("check-this-user-info");
		}
	}, [selfProfile.data]);

	const getErrorMessage = (error: Error | null): string => {
		if (!error) return "Unknown error";
		if (error.message) return error.message;
		return String(error);
	};

	return (
		<section
			className="p-4 space-y-2 max-w-4xl"
			aria-labelledby="this-user-heading"
		>
			<h2 id="this-user-heading" className="text-lg font-semibold">
				This User Info
			</h2>

			{selfProfile.isPending && (
				<p className="text-gray-600" aria-live="polite">
					Loading user profile...
				</p>
			)}

			{selfProfile.isError && (
				<p
					className="text-red-700 bg-red-50 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load user profile error:</strong>{" "}
					{getErrorMessage(selfProfile.error)}
				</p>
			)}

			{selfProfile.data && (
				<pre className="bg-gray-100 p-3 rounded border border-gray-200 overflow-auto max-h-96 text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(selfProfile.data, null, 2)}
				</pre>
			)}
		</section>
	);
}

function TestOtherUserInfo(props: { notify: NotifierFn }) {
	const { notify } = props;
	const otherAddress = useOtherAddress();
	const otherProfile = useUserProfileByQuery({ address: otherAddress });

	useEffectOnce(() => {
		if (otherProfile.data) {
			notify("check-other-user-info");
		}
	}, [otherProfile.data]);

	const getErrorMessage = (error: Error | null): string => {
		if (!error) return "Unknown error";
		if (error.message) return error.message;
		return String(error);
	};

	return (
		<section
			className="p-4 space-y-2 max-w-4xl"
			aria-labelledby="other-user-heading"
		>
			<h2 id="other-user-heading" className="text-lg font-semibold">
				Other User Info
			</h2>

			{otherProfile.isPending && (
				<p className="text-gray-600" aria-live="polite">
					Loading other user profile...
				</p>
			)}

			{otherProfile.isError && (
				<p
					className="text-red-700 bg-red-50 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load other user profile error:</strong>{" "}
					{getErrorMessage(otherProfile.error)}
				</p>
			)}

			{otherProfile.data && (
				<pre className="bg-gray-100 p-3 rounded border border-gray-200 overflow-auto max-h-96 text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(otherProfile.data, null, 2)}
				</pre>
			)}
		</section>
	);
}

function TestFileSend(props: { notify: NotifierFn }) {
	const { notify } = props;
	const otherAddress = useOtherAddress();
	const { data: otherProfile } = useUserProfileByQuery({
		address: otherAddress,
	});
	const { reload: otherReload } = useOtherReload();
	const { setSafeTimeout, clearSafeTimeout } = useTimeout();
	const sendFile = useSendFile();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
	const [fileError, setFileError] = useState<FileValidationError | null>(null);
	const [fileReadError, setFileReadError] = useState<string | null>(null);
	const inputId = useId();

	useEffectOnce(() => {
		if (sendFile.data) {
			notify("file-send");
			setSafeTimeout(() => {
				otherReload();
			}, RELOAD_DELAY_MS);
		}

		return () => {
			clearSafeTimeout();
		};
	}, [sendFile.data]);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		// Reset errors
		setFileError(null);
		setFileReadError(null);

		if (!file) return;

		// Validate file before processing
		const validationError = validateFile(file);
		if (validationError) {
			setFileError(validationError);
			return;
		}

		setSelectedFile(file);

		const reader = new FileReader();

		reader.onload = (e) => {
			const arrayBuffer = e.target?.result;
			if (arrayBuffer instanceof ArrayBuffer) {
				setFileBytes(new Uint8Array(arrayBuffer));
			} else {
				setFileReadError("Failed to read file: invalid data format");
			}
		};

		reader.onerror = () => {
			setFileReadError(
				`Failed to read file: ${reader.error?.message || "Unknown error"}`,
			);
		};

		reader.onabort = () => {
			setFileReadError("File reading was aborted");
		};

		reader.readAsArrayBuffer(file);
	};

	// Safe parsing of profile data with fallbacks
	const encryptionPublicKey = useMemo(() => {
		if (!otherProfile?.encryptionPublicKey) return null;
		const key =
			typeof otherProfile.encryptionPublicKey === "string"
				? otherProfile.encryptionPublicKey
				: null;
		return isValidEthereumAddress(key) ? key : null;
	}, [otherProfile?.encryptionPublicKey]);

	if (!otherProfile) {
		return (
			<section
				className="p-4 space-y-2 max-w-4xl"
				aria-labelledby="file-send-heading"
			>
				<h2 id="file-send-heading" className="text-lg font-semibold">
					File Send Test
				</h2>
				<p className="text-gray-600" aria-live="polite">
					Loading other person profile, please wait...
				</p>
			</section>
		);
	}

	// Truncate long filenames for display
	const displayFileName = selectedFile
		? selectedFile.name.length > 50
			? `${selectedFile.name.slice(0, 47)}...`
			: selectedFile.name
		: "Default Test File";

	return (
		<section
			className="p-4 space-y-4 max-w-4xl"
			aria-labelledby="file-send-heading"
		>
			<h2 id="file-send-heading" className="text-lg font-semibold">
				File Send Test
			</h2>

			<div>
				<label htmlFor={inputId} className="block text-sm font-medium mb-2">
					Select PDF File (max 10MB):
				</label>
				<input
					id={inputId}
					name="pdf-file"
					type="file"
					accept="application/pdf"
					onChange={handleFileSelect}
					aria-invalid={fileError ? "true" : "false"}
					aria-describedby={fileError ? `${inputId}-error` : `${inputId}-help`}
					className="block w-full text-sm text-gray-700
						file:mr-4 file:py-2 file:px-4
						file:rounded-full file:border-0
						file:text-sm file:font-semibold
						file:bg-blue-50 file:text-blue-700
						hover:file:bg-blue-100
						focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				/>
				<span id={`${inputId}-help`} className="sr-only">
					Accepts PDF files up to 10MB
				</span>

				{fileError && (
					<p
						id={`${inputId}-error`}
						className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded"
						role="alert"
						aria-live="assertive"
					>
						{fileError.message}
					</p>
				)}

				{fileReadError && (
					<p
						className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded"
						role="alert"
						aria-live="assertive"
					>
						{fileReadError}
					</p>
				)}

				{selectedFile && !fileError && !fileReadError && (
					<p className="mt-2 text-sm text-gray-700" aria-live="polite">
						Selected:{" "}
						<span className="font-medium break-all">{displayFileName}</span> (
						{(selectedFile.size / 1024).toFixed(2)} KB)
					</p>
				)}
			</div>

			<Button
				mutation={sendFile}
				mutationArgs={{
					bytes: fileBytes || dummyBytes,
					signers: encryptionPublicKey
						? [
								{
									address: otherAddress,
									encryptionPublicKey,
									signaturePosition: [10, 20, 30, 40],
								},
							]
						: [],
					viewers: [],
					metadata: {
						name: selectedFile ? selectedFile.name : "Test File",
					},
				}}
			>
				Send {displayFileName}
			</Button>
		</section>
	);
}

function ShowReceivedFiles() {
	const receivedFiles = useReceivedFiles();

	// Memoize list to prevent unnecessary re-renders
	const fileList = useMemo(() => {
		if (!receivedFiles.data?.length) return null;
		return receivedFiles.data.map((file) => (
			<li key={file.pieceCid.toString()}>
				<ReceivedFileItem pieceCid={file.pieceCid} />
			</li>
		));
	}, [receivedFiles.data]);

	return (
		<section
			className="p-4 space-y-2 max-w-4xl"
			aria-labelledby="received-files-heading"
		>
			<h2 id="received-files-heading" className="text-lg font-semibold">
				Received Files
			</h2>

			{receivedFiles.isPending && (
				<p className="text-gray-600" aria-live="polite">
					Loading received files...
				</p>
			)}

			{receivedFiles.isError && (
				<p
					className="text-red-700 bg-red-50 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load received files error:</strong>{" "}
					{receivedFiles.error instanceof Error
						? receivedFiles.error.message
						: String(receivedFiles.error)}
				</p>
			)}

			{receivedFiles.data && receivedFiles.data.length === 0 && (
				<p className="text-gray-500 italic">No received files.</p>
			)}

			{fileList && <ul className="space-y-2">{fileList}</ul>}
		</section>
	);
}

function ReceivedFileItem(props: { pieceCid: string }) {
	const { pieceCid } = props;
	const { data: file } = useFileInfo({ pieceCid });
	const viewFile = useViewFile();
	const decoder = useMemo(() => new TextDecoder(), []);
	const ackFile = useAckFile();
	const signFile = useSignFile();
	const { setSafeTimeout, clearSafeTimeout } = useTimeout();
	const { reload: otherReload } = useOtherReload();
	const selfProfile = useUserProfile();

	useEffectOnce(() => {
		if (signFile.data) {
			setSafeTimeout(() => {
				otherReload();
			}, RELOAD_DELAY_MS);
		}

		return () => {
			clearSafeTimeout();
		};
	}, [signFile.data]);

	// Compute all values that depend on file data (must be after all hooks)
	const canView = Boolean(file?.kemCiphertext && file?.encryptedEncryptionKey);
	const kemCiphertext = parseString(file?.kemCiphertext);
	const encryptedEncryptionKey = parseString(file?.encryptedEncryptionKey);
	const status = parseFileStatus(file?.status);
	const displayCid = file?.pieceCid.toString() ?? "";
	const truncatedCid =
		displayCid.length > 60 ? `${displayCid.slice(0, 57)}...` : displayCid;

	// Safe address extraction
	const currentUserAddress = useMemo(() => {
		const address = selfProfile.data?.walletAddress;
		return parseEthereumAddress(address);
	}, [selfProfile.data?.walletAddress]);

	// Decode file content safely
	const decodedContent = useMemo(() => {
		if (!viewFile.data?.fileBytes) return null;
		try {
			return decoder.decode(viewFile.data.fileBytes);
		} catch {
			return "[Binary content - cannot display as text]";
		}
	}, [viewFile.data?.fileBytes, decoder]);

	// Handle loading state
	if (!file) {
		return (
			<div className="bg-gray-100 p-3 rounded border border-gray-200">
				<p className="text-gray-600">Loading file info...</p>
			</div>
		);
	}

	return (
		<article className="bg-gray-100 p-3 rounded border border-gray-200">
			<dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm mb-3">
				<dt className="text-gray-600">File CID:</dt>
				<dd className="break-all font-mono text-xs" title={displayCid}>
					{truncatedCid}
				</dd>

				<dt className="text-gray-600">Sender:</dt>
				<dd className="break-all font-mono text-xs">{file.sender}</dd>

				<dt className="text-gray-600">Status:</dt>
				<dd>{file.status}</dd>
			</dl>

			<div className="flex flex-wrap gap-2 items-start">
				{canView && kemCiphertext && encryptedEncryptionKey && status ? (
					<Button
						mutation={viewFile}
						mutationArgs={{
							pieceCid: file.pieceCid,
							kemCiphertext,
							encryptedEncryptionKey,
							status,
						}}
					>
						View File
					</Button>
				) : (
					<Button mutation={ackFile} mutationArgs={{ pieceCid: file.pieceCid }}>
						Acknowledge File
					</Button>
				)}
			</div>

			<div className="mt-3 space-y-2">
				{viewFile.isSuccess && decodedContent && (
					<div className="bg-white p-3 rounded border border-gray-200">
						<h4 className="text-sm font-medium text-gray-600 mb-2">
							File Content:
						</h4>
						<pre className="text-xs break-all whitespace-pre-wrap overflow-auto max-h-48">
							{decodedContent.length > 2000
								? `${decodedContent.slice(0, 1997)}...`
								: decodedContent}
						</pre>
					</div>
				)}

				{canView && file.signatures.length === 0 && currentUserAddress && (
					<div className="mt-2">
						<SignWithIDKit signerAddress={currentUserAddress} file={file} />
					</div>
				)}
			</div>
		</article>
	);
}

function ShowSentFiles() {
	const sentFiles = useSentFiles();

	// Memoize list to prevent unnecessary re-renders
	const fileList = useMemo(() => {
		if (!sentFiles.data?.length) return null;
		return sentFiles.data.map((file) => (
			<li key={file.pieceCid.toString()}>
				<SentFileItem pieceCid={file.pieceCid} />
			</li>
		));
	}, [sentFiles.data]);

	return (
		<section
			className="p-4 space-y-2 max-w-4xl"
			aria-labelledby="sent-files-heading"
		>
			<h2 id="sent-files-heading" className="text-lg font-semibold">
				Sent Files
			</h2>

			{sentFiles.isPending && (
				<p className="text-gray-600" aria-live="polite">
					Loading sent files...
				</p>
			)}

			{sentFiles.isError && (
				<p
					className="text-red-700 bg-red-50 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load sent files error:</strong>{" "}
					{sentFiles.error instanceof Error
						? sentFiles.error.message
						: String(sentFiles.error)}
				</p>
			)}

			{sentFiles.data && sentFiles.data.length === 0 && (
				<p className="text-gray-500 italic">No sent files.</p>
			)}

			{fileList && <ul className="space-y-2">{fileList}</ul>}
		</section>
	);
}

function SentFileItem(props: { pieceCid: string }) {
	const { pieceCid } = props;
	const { data: file } = useFileInfo({ pieceCid });
	const viewFile = useViewFile();
	const decoder = useMemo(() => new TextDecoder(), []);

	// Compute values that depend on file data (must be after all hooks)
	const kemCiphertext = parseString(file?.kemCiphertext);
	const encryptedEncryptionKey = parseString(file?.encryptedEncryptionKey);
	const status = parseFileStatus(file?.status);
	const displayCid = file?.pieceCid.toString() ?? "";
	const truncatedCid =
		displayCid.length > 60 ? `${displayCid.slice(0, 57)}...` : displayCid;
	const canView = Boolean(kemCiphertext && encryptedEncryptionKey && status);

	// Decode file content safely
	const decodedContent = useMemo(() => {
		if (!viewFile.data?.fileBytes) return null;
		try {
			return decoder.decode(viewFile.data.fileBytes);
		} catch {
			return "[Binary content - cannot display as text]";
		}
	}, [viewFile.data?.fileBytes, decoder]);

	// Handle loading state
	if (!file) {
		return (
			<div className="bg-gray-100 p-3 rounded border border-gray-200">
				<p className="text-gray-600">Loading file info...</p>
			</div>
		);
	}

	return (
		<article className="bg-gray-100 p-3 rounded border border-gray-200">
			<dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm mb-3">
				<dt className="text-gray-600">File CID:</dt>
				<dd className="break-all font-mono text-xs" title={displayCid}>
					{truncatedCid}
				</dd>

				<dt className="text-gray-600">Sender:</dt>
				<dd className="break-all font-mono text-xs">{file.sender}</dd>

				<dt className="text-gray-600">Status:</dt>
				<dd>{file.status}</dd>

				<dt className="text-gray-600">Signatures:</dt>
				<dd>{file.signatures.length}</dd>
			</dl>

			{canView && kemCiphertext && encryptedEncryptionKey && status ? (
				<Button
					mutation={viewFile}
					mutationArgs={{
						pieceCid: file.pieceCid,
						kemCiphertext,
						encryptedEncryptionKey,
						status,
					}}
				>
					View File
				</Button>
			) : (
				<p className="text-sm text-gray-500 italic">
					Cannot view file (missing required data)
				</p>
			)}

			{viewFile.isSuccess && decodedContent && (
				<div className="mt-3 bg-white p-3 rounded border border-gray-200">
					<h4 className="text-sm font-medium text-gray-600 mb-2">
						File Content:
					</h4>
					<pre className="text-xs break-all whitespace-pre-wrap overflow-auto max-h-48">
						{decodedContent.length > 2000
							? `${decodedContent.slice(0, 1997)}...`
							: decodedContent}
					</pre>
				</div>
			)}
		</article>
	);
}
