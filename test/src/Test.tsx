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
import { useId, useState } from "react";
import { useOtherAddress, useOtherReload } from "./App";
import Button from "./Button";
import { dummyBytes } from "./dumy";
import { useEffectOnce } from "./hooks/useEffectOnce";

type TestName =
	| "login"
	| "check-this-user-info"
	| "check-other-user-info"
	| "approve-sender"
	| "check-send"
	| "file-send"
	| "file-sign";
type NotifierFn = (name: TestName) => void;

export default function () {
	const { ready } = useFilosignContext();
	const logout = useLogout();
	const isLoggedIn = useIsLoggedIn();

	const [done, setDone] = useState<TestName[]>([]);
	function notifyDone(name: TestName) {
		setDone((prev) => {
			if (prev.includes(name)) return prev;
			return [...prev, name];
		});
	}
	function isDone(name: TestName) {
		return done.includes(name);
	}

	return (
		ready && (
			<div className="flex flex-col">
				<TestLogin notify={notifyDone} />

				{isLoggedIn.data === true && (
					<>
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
							<>
								<TestFileSend notify={notifyDone} />
								<ShowReceivedFiles />
								<ShowSentFiles />
							</>
						)}
					</>
				)}

				<Button mutation={logout}>Logout</Button>
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
			login.mutate({ pin: "1234" });
		}
	}, [isRegistered.data]);
	useEffectOnce(() => {
		if (isLoggedIn.data === false) {
			login.mutate({ pin: "1234" });
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

	return (
		<div className="p-4 space-y-2 max-w-4xl">
			{isLoggedIn.data === false && (
				<Button mutation={login} mutationArgs={{ pin: "1234" }}>
					Login
				</Button>
			)}
			{login.isPending && <p>Logging in...</p>}
			{login.isError && (
				<p className="text-red-600">Login error: {String(login.error)}</p>
			)}
			{login.isSuccess && (
				<p className="text-green-600">Logged in successfully!</p>
			)}

			<p>Is Registered: {isRegistered.data ? "Yes" : "No"}</p>
			<p>Is Logged In: {isLoggedIn.data ? "Yes" : "No"}</p>
		</div>
	);
}

function TestApproveSender(props: { notify: NotifierFn }) {
	const { notify } = props;

	const otherAddress = useOtherAddress();
	const approveSender = useApproveSender();
	const canReceiveFrom = useCanReceiveFrom({ sender: otherAddress });
	const { reload: otherReload } = useOtherReload();

	useEffectOnce(() => {
		if (canReceiveFrom.data === false) {
			approveSender.mutate({
				sender: otherAddress,
			});

			setTimeout(() => {
				otherReload();
			}, 1000);
		}
	}, [canReceiveFrom.data]);

	useEffectOnce(() => {
		if (canReceiveFrom.data) {
			notify("approve-sender");
		}
	}, [canReceiveFrom.data]);

	useEffectOnce(() => {
		notify("approve-sender");
	}, [approveSender.isSuccess]);

	return (
		<div className="p-4 space-y-2 max-w-4xl">
			{canReceiveFrom.data === true && (
				<p className="text-green-600">Can already receive from sender.</p>
			)}
			{approveSender.isPending && <p>Approving sender...</p>}
			{approveSender.isError && (
				<p className="text-red-600">
					Approve sender error: {String(approveSender.error)}
				</p>
			)}
			{approveSender.isSuccess && (
				<p className="text-green-600">Sender approved successfully!</p>
			)}
		</div>
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
		<div className="p-4 space-y-2 max-w-4xl">
			{canSendTo.isPending && <p>Checking if can receive from sender...</p>}
			{canSendTo.data === true && (
				<p className="text-green-600">Can receive from sender.</p>
			)}
			{canSendTo.data === false && (
				<p className="text-red-600">Cannot receive from sender.</p>
			)}
		</div>
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

	return (
		<div className="p-4 space-y-2 max-w-4xl">
			<p>This User Info:</p>
			{selfProfile.isPending && <p>Loading user profile...</p>}
			{selfProfile.isError && (
				<p className="text-red-600">
					Load user profile error: {String(selfProfile.error)}
				</p>
			)}
			{selfProfile.data && (
				<pre className="bg-gray-100 p-2 rounded max-w-[30vw] overflow-scroll">
					{JSON.stringify(selfProfile.data, null, 2)}
				</pre>
			)}
		</div>
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

	return (
		<div className="p-4 space-y-2 max-w-4xl">
			<p>Other User Info:</p>
			{otherProfile.isPending && <p>Loading other user profile...</p>}
			{otherProfile.isError && (
				<p className="text-red-600">
					Load other user profile error: {String(otherProfile.error)}
				</p>
			)}
			{otherProfile.data && (
				<pre className="bg-gray-100 p-2 rounded max-w-[30vw] overflow-scroll">
					{JSON.stringify(otherProfile.data, null, 2)}
				</pre>
			)}
		</div>
	);
}

function TestFileSend(props: { notify: NotifierFn }) {
	const { notify } = props;
	const otherAddress = useOtherAddress();
	const { data: otherProfile } = useUserProfileByQuery({
		address: otherAddress,
	});
	const { reload: otherReload } = useOtherReload();
	const sendFile = useSendFile();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
	const inputId = useId();

	useEffectOnce(() => {
		if (sendFile.data) {
			notify("file-send");
			setTimeout(() => {
				otherReload();
			}, 1000);
		}
	}, [sendFile.data]);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			if (file.type !== "application/pdf") {
				alert("Please select a PDF file");
				return;
			}
			setSelectedFile(file);

			const reader = new FileReader();
			reader.onload = (e) => {
				const arrayBuffer = e.target?.result as ArrayBuffer;
				if (arrayBuffer) {
					setFileBytes(new Uint8Array(arrayBuffer));
				}
			};
			reader.readAsArrayBuffer(file);
		}
	};

	if (!otherProfile) return <p>loading other person profile, wait</p>;

	return (
		<div className="p-4 space-y-2 max-w-4xl">
			<div>
				<label htmlFor="pdf-file" className="block text-sm font-medium mb-2">
					Select PDF File:
				</label>
				<input
					id={inputId}
					type="file"
					accept=".pdf"
					onChange={handleFileSelect}
					className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
				/>
				{selectedFile && (
					<p className="mt-2 text-sm text-gray-600">
						Selected: {selectedFile.name} (
						{(selectedFile.size / 1024).toFixed(2)} KB)
					</p>
				)}
			</div>

			<Button
				mutation={sendFile}
				mutationArgs={{
					bytes: fileBytes || dummyBytes,
					signers: [
						{
							address: otherAddress,
							encryptionPublicKey:
								otherProfile.encryptionPublicKey as `0x${string}`,
							signaturePosition: [10, 20, 30, 40],
						},
					],
					viewers: [],
					metadata: {
						name: selectedFile ? selectedFile.name : "Test File",
					},
				}}
			>
				Send {selectedFile ? selectedFile.name : "Default Test File"}
			</Button>
		</div>
	);
}

function ShowReceivedFiles() {
	const receivedFiles = useReceivedFiles();

	return (
		<div className="p-4 space-y-2 max-w-4xl">
			<p>Received Files:</p>
			{receivedFiles.isPending && <p>Loading received files...</p>}
			{receivedFiles.isError && (
				<p className="text-red-600">
					Load received files error: {String(receivedFiles.error)}
				</p>
			)}
			{receivedFiles.data && receivedFiles.data.length === 0 && (
				<p>No received files.</p>
			)}
			{receivedFiles.data && receivedFiles.data.length > 0 && (
				<div className="space-y-2">
					{receivedFiles.data.map((file) => (
						<ReceivedFileItem
							key={file.pieceCid.toString()}
							pieceCid={file.pieceCid}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ReceivedFileItem(props: { pieceCid: string }) {
	const { pieceCid } = props;
	const { data: file } = useFileInfo({ pieceCid });
	const viewFile = useViewFile();
	const decoder = new TextDecoder();
	const ackFile = useAckFile();
	const signFile = useSignFile();
	const { reload: otherReload } = useOtherReload();

	useEffectOnce(() => {
		if (signFile.data) {
			setTimeout(() => {
				otherReload();
			}, 1000);
		}
	}, [signFile.data]);

	if (!file) return <p>Loading file info...</p>;
	const canView =
		file.kemCiphertext !== null && file.encryptedEncryptionKey !== null;
	return (
		<div className="bg-gray-100 p-2 rounded max-w-4xl">
			<p>File CID: {file.pieceCid.toString()}</p>
			<p>Sender: {file.sender}</p>
			<p>Status: {file.status}</p>
			{canView ? (
				<Button
					mutation={viewFile}
					mutationArgs={{
						pieceCid: file.pieceCid,
						kemCiphertext: file.kemCiphertext as string,
						encryptedEncryptionKey: file.encryptedEncryptionKey as string,
						status: file.status as "s3" | "foc",
					}}
				>
					View File
				</Button>
			) : (
				<Button mutation={ackFile} mutationArgs={{ pieceCid: file.pieceCid }}>
					Acknowledge File
				</Button>
			)}{" "}
			<div>
				{viewFile.isSuccess && viewFile.data && (
					<p className="whitespace-pre-wrap wrap-break-word">
						{decoder.decode(viewFile.data.fileBytes)}
					</p>
				)}

				{canView && file.signatures.length === 0 && (
					<Button
						mutation={signFile}
						mutationArgs={{
							pieceCid: file.pieceCid,
						}}
					>
						Sign File
					</Button>
				)}
			</div>
		</div>
	);
}

function ShowSentFiles() {
	const sentFiles = useSentFiles();

	return (
		<div className="p-4 space-y-2 max-w-4xl">
			<p>Sent Files:</p>
			{sentFiles.isPending && <p>Loading sent files...</p>}
			{sentFiles.isError && (
				<p className="text-red-600">
					Load sent files error: {String(sentFiles.error)}
				</p>
			)}
			{sentFiles.data && sentFiles.data.length === 0 && <p>No sent files.</p>}
			<ul className="space-y-2">
				{sentFiles.data?.map((file) => (
					<SentFileItem
						key={file.pieceCid.toString()}
						pieceCid={file.pieceCid}
					/>
				))}
			</ul>
		</div>
	);
}

function SentFileItem(props: { pieceCid: string }) {
	const { pieceCid } = props;
	const { data: file } = useFileInfo({ pieceCid });
	const viewFile = useViewFile();
	const decoder = new TextDecoder();

	if (!file) return <p>Loading file info...</p>;

	return (
		<div className="bg-gray-100 p-2 rounded max-w-4xl">
			<p>File CID: {file.pieceCid.toString()}</p>
			<p>Sender: {file.sender}</p>
			<p>Status: {file.status}</p>
			<p>File signatures : {file.signatures.length}</p>
			<Button
				mutation={viewFile}
				mutationArgs={{
					pieceCid: file.pieceCid,
					kemCiphertext: file.kemCiphertext as string,
					encryptedEncryptionKey: file.encryptedEncryptionKey as string,
					status: file.status as "s3" | "foc",
				}}
			>
				View File
			</Button>
			<div>
				{viewFile.isSuccess && viewFile.data && (
					<p className="whitespace-pre-wrap wrap-break-word">
						{decoder.decode(viewFile.data.fileBytes)}
					</p>
				)}
			</div>
		</div>
	);
}
