import React, { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { _t } from "../../i18n";
import { SwapAmountControl } from "./swap-amount-control";
import { MarketInfo } from "./market-info";
import { MarketAsset, MarketPairs } from "./market-pair";
import { ActiveUser } from "../../store/active-user/types";
import { getBalance } from "./api/get-balance";
import { getMarketRate } from "./api/get-market-rate";
import { getCGMarket } from "./api/coingecko-api";
import { MarketSwapFormStep } from "./form-step";
import { SignMethods } from "./sign-methods";
import { Global } from "../../store/global/types";
import { MarketSwapFormHeader } from "./market-swap-form-header";
import { SucceededStep } from "./succeeded-step";
import { checkSvg, swapSvg } from "../../img/svg";

interface Props {
  activeUser: ActiveUser | null;
  global: Global;
  addAccount: any;
  updateActiveUser: any;
  signingKey: string;
  setSigningKey: (key: string) => void;
}

export const MarketSwapForm = ({
  activeUser,
  global,
  addAccount,
  updateActiveUser,
  signingKey,
  setSigningKey
}: Props) => {
  const [step, setStep] = useState(MarketSwapFormStep.FORM);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [fromAsset, setFromAsset] = useState(MarketAsset.HIVE);
  const [toAsset, setToAsset] = useState(MarketAsset.HBD);

  const [balance, setBalance] = useState("");

  const [marketRate, setMarketRate] = useState(0);
  const [usdFromMarketRate, setUsdFromMarketRate] = useState(0);
  const [usdToMarketRate, setUsdToMarketRate] = useState(0);

  const [disabled, setDisabled] = useState(false);
  const [isAmountMoreThanBalance, setIsAmountMoreThanBalance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<MarketAsset[]>([]);

  let interval: any;

  useEffect(() => {
    fetchMarket();
    // interval = setInterval(() => fetchMarket(), 20000);
    return () => {
      // clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeUser) setBalance(getBalance(fromAsset, activeUser));
  }, [activeUser]);

  useEffect(() => {
    validateBalance();
  }, [from, balance]);

  useEffect(() => {
    const nextAvailableAssets = MarketPairs[toAsset];
    if (!nextAvailableAssets.includes(toAsset)) {
      setToAsset(nextAvailableAssets[0]);
      fetchMarket();
    }

    setAvailableAssets(nextAvailableAssets);
    if (activeUser) setBalance(getBalance(fromAsset, activeUser));
  }, [fromAsset]);

  const swap = () => {
    setToAsset(fromAsset);
    setFromAsset(toAsset);
    setTo(from);
    setFrom(to);
    setUsdFromMarketRate(usdToMarketRate);
    setUsdToMarketRate(usdFromMarketRate);
  };

  const fetchMarket = async () => {
    setDisabled(true);
    setMarketRate(await getMarketRate(fromAsset));
    setDisabled(false);

    const [fromUsdRate, toUsdRate] = await getCGMarket(fromAsset, toAsset);
    setUsdFromMarketRate(fromUsdRate);
    setUsdToMarketRate(toUsdRate);
  };

  const submit = () => {
    if (step === MarketSwapFormStep.FORM) setStep(MarketSwapFormStep.SIGN);
    else if (step === MarketSwapFormStep.SIGN) {
    }
  };

  const back = () => {
    if (step === MarketSwapFormStep.SIGN) setStep(MarketSwapFormStep.FORM);
  };

  const numberAmount = (v: string) => +v.replace(/,/gm, "");

  const validateBalance = () => {
    if (balance) {
      let [availableBalance] = balance.split(" ");
      const amount = numberAmount(from);
      const availableBalanceAmount = +availableBalance;

      if (!isNaN(availableBalanceAmount)) {
        setIsAmountMoreThanBalance(amount > availableBalanceAmount);
      }
    }
  };

  const reset = () => {
    setFrom("0");
    setTo("0");
    fetchMarket();
    setStep(MarketSwapFormStep.FORM);
  };

  return (
    <div className="market-swap-form p-4">
      <MarketSwapFormHeader step={step} loading={loading || disabled} onBack={back} />
      <Form onSubmit={(e) => submit()}>
        <SwapAmountControl
          className={step === MarketSwapFormStep.SIGN ? "mb-3" : ""}
          asset={fromAsset}
          balance={balance}
          availableAssets={MarketPairs[fromAsset]}
          labelKey="market.from"
          value={from}
          setValue={(v) => {
            setFrom(v);
            setTo(marketRate * numberAmount(v) + "");
          }}
          setAsset={(v) => setFromAsset(v)}
          usdRate={usdFromMarketRate}
          disabled={
            step === MarketSwapFormStep.SIGN ||
            step === MarketSwapFormStep.SUCCESS ||
            disabled ||
            loading
          }
          elementAfterBalance={
            isAmountMoreThanBalance ? (
              <small className="usd-balance bold text-secondary d-block text-danger mt-3">
                {_t("market.more-than-balance")}
              </small>
            ) : (
              <></>
            )
          }
        />
        {[MarketSwapFormStep.FORM, MarketSwapFormStep.SUCCESS].includes(step) ? (
          <div className="swap-button-container">
            <div className="overlay">
              {step === MarketSwapFormStep.FORM ? (
                <Button variant="" className="swap-button border" onClick={swap}>
                  {swapSvg}
                </Button>
              ) : (
                <></>
              )}
              {step === MarketSwapFormStep.SUCCESS ? (
                <Button variant="" className="swap-button border text-success">
                  {checkSvg}
                </Button>
              ) : (
                <></>
              )}
            </div>
          </div>
        ) : (
          <></>
        )}
        <SwapAmountControl
          asset={toAsset}
          availableAssets={availableAssets}
          labelKey="market.to"
          value={to}
          setValue={(v) => {
            setTo(v);
            setFrom(numberAmount(v) / marketRate + "");
          }}
          setAsset={(v) => setToAsset(v)}
          usdRate={usdToMarketRate}
          disabled={
            step === MarketSwapFormStep.SIGN ||
            step === MarketSwapFormStep.SUCCESS ||
            disabled ||
            loading
          }
        />
        <MarketInfo
          className="mt-4"
          marketRate={marketRate}
          toAsset={toAsset}
          fromAsset={fromAsset}
          usdFromMarketRate={usdFromMarketRate}
        />
        <div>
          {step === MarketSwapFormStep.FORM ? (
            <Button
              block={true}
              disabled={disabled || loading || numberAmount(from) === 0 || isAmountMoreThanBalance}
              className="py-3 mt-4"
              onClick={() => submit()}
            >
              {_t("market.continue")}
            </Button>
          ) : (
            <></>
          )}
          {step === MarketSwapFormStep.SIGN ? (
            <SignMethods
              global={global}
              disabled={disabled || loading || numberAmount(from) === 0}
              asset={fromAsset}
              activeUser={activeUser}
              loading={loading}
              setLoading={setLoading}
              updateActiveUser={updateActiveUser}
              addAccount={addAccount}
              fromAmount={from}
              toAmount={to}
              marketRate={marketRate}
              onSuccess={() => setStep(MarketSwapFormStep.SUCCESS)}
              signingKey={signingKey}
              setSigningKey={(key) => setSigningKey(key)}
            />
          ) : (
            <></>
          )}
          {step === MarketSwapFormStep.SUCCESS ? <SucceededStep onReset={reset} /> : <></>}
        </div>
      </Form>
    </div>
  );
};
