import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zuski } from "../target/types/zuski";
import { TransactionMessage, SystemProgram, VersionedTransaction, PublicKey, SendTransactionError } from "@solana/web3.js";
import * as fs from "fs";


describe("Zuski", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = new anchor.web3.Connection(
    "https://api.testnet.sonic.game",
    //   "https://metaplex.devnet.rpcpool.com/",
    // "https://api.metaplex.solana.com/",
    { commitment: "confirmed" }
  );
  const commitment = "processed";
  // console.log("Connection: ", connection);

  const program = anchor.workspace.Zuski as Program<Zuski>;

  // variables
  // const admin = anchor.web3.Keypair.generate();
     // Load from a keypair file
    //  const userWallet = anchor.web3.Keypair.fromSecretKey(
    //   Uint8Array.from(JSON.parse(fs.readFileSync('/path/to/keypair.json', 'utf-8')))
    // );
  const admin = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/home/afolabi/.config/solana/id.json', 'utf-8')))
  );
  const user = anchor.web3.Keypair.generate();
  const treasury_wallet = anchor.web3.Keypair.generate();
  // J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix
  const pyth_account = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");

  let deposit_amount = 5_000_000_000;
  let bet_amount = 2_000_000_000;
  let win_percentage = [33, 66, 99];
  let reward_policy = [10, 0, 0];

  let global_state: PublicKey;
  let user_state: PublicKey;
  let vault: PublicKey;

  const GLOBAL_STATE_SEED = "GLOBAL-STATE-SEED";
  const USER_STATE_SEED = "USER-STATE-SEED";
  const VAULT_SEED = "VAULT_SEED";

  it("Is initialized!", async () => {
    // 1. Airdrop 100 SOL to admin
    // const signature = await provider.connection.requestAirdrop(admin.publicKey, 1_000_000_000);
    const latestBlockhash = await connection.getLatestBlockhash();
    // await provider.connection.confirmTransaction(
    //   {
    //     signature,
    //     ...latestBlockhash,
    //   },
    //   commitment
    // );

    // 2. Fund main roles: admin and user
    const fundingTxMessageV0 = new TransactionMessage({
      payerKey: admin.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: admin.publicKey,
          toPubkey: user.publicKey,
          lamports: 9_000_000_000,
        })
      ],
    }).compileToV0Message();

    const fundingTx = new VersionedTransaction(fundingTxMessageV0);
    fundingTx.sign([admin]);

    // Send and confirm the transaction with proper error handling
    try {
      const result = await connection.sendRawTransaction(fundingTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: commitment,
        maxRetries: 3
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature: result,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, commitment);

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      console.log("Transaction successful:", result);
    } catch (error) {
      if (error instanceof SendTransactionError) {
        console.error("Transaction Error Details:");
        console.error("Error message:", error.message);
        console.error("Error logs:", error.logs);
        throw error;
      } else {
        console.error("Unexpected error:", error);
        throw error;
      }
    }

    global_state = PublicKey.findProgramAddressSync([
      Buffer.from(anchor.utils.bytes.utf8.encode(GLOBAL_STATE_SEED)),
      admin.publicKey.toBytes()], program.programId)[0];
    vault = PublicKey.findProgramAddressSync([Buffer.from(anchor.utils.bytes.utf8.encode(VAULT_SEED))], program.programId)[0];
    // Add your test here.
    const tx = await program.methods.initialize().accounts({
      admin: admin.publicKey,
      globalState: global_state,
      vault: vault,
      systemProgram: SystemProgram.programId,
    }).signers([admin]).rpc();
  });

  it("Set Operator", async () => {
    const tx = await program.methods.setOperator(treasury_wallet.publicKey).accounts({
      admin: admin.publicKey,
      globalState: global_state,
    }).signers([admin]).rpc();
  });

  it("Set Info", async () => {
    const tx = await program.methods.setInfo(treasury_wallet.publicKey, new anchor.BN(5), false).accounts({
      operator: treasury_wallet.publicKey,
      globalState: global_state,
    }).signers([treasury_wallet]).rpc();
  });

  // it("Coin Flip", async () => {
  //   user_state = PublicKey.findProgramAddressSync([Buffer.from(anchor.utils.bytes.utf8.encode(USER_STATE_SEED)), user.publicKey.toBytes()], program.programId)[0];
  //   let _globalState = await program.account.globalState.fetch(global_state);
  //   console.log("Treasury Fee: ", _globalState.treasuryFee.toNumber());

  //   const tx = await program.methods.coinflip(new anchor.BN(bet_amount)).accounts({
  //     globalState: global_state,
  //     pythAccount: pyth_account,
  //     treasuryAccount: treasury_wallet.publicKey,
  //     user: user.publicKey,
  //     userState: user_state,
  //     vault: vault,
  //     systemProgram: SystemProgram.programId,
  //   }).signers([user]).rpc();
  //   let _user_state = await program.account.userState.fetch(user_state);
  //   console.log("user address : ", _user_state.user.toBase58());
  //   console.log("reward amount : ", _user_state.rewardAmount.toNumber());
  //   console.log("last spin result : ", _user_state.lastSpinresult);

  //   let treasuryAccount = await provider.connection.getAccountInfo(treasury_wallet.publicKey);
  //   console.log("Treasury: ", treasuryAccount.lamports);
  // });
});

