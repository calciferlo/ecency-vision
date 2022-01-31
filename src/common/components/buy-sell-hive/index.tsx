import React, { Component } from "react";
import { addUser } from "../../store/users";
import { setActiveUser, updateActiveUser } from "../../store/active-user";
import { setSigningKey } from "../../store/signing-key";
import { addAccount } from "../../store/accounts";

import { Modal, Button } from "react-bootstrap";

import { Global } from "../../store/global/types";
import { ActiveUser } from "../../store/active-user/types";

import BaseComponent from "../base";
import { error } from "../feedback";

import { getAccountFull } from "../../api/hive";

import {
  formatError,
  limitOrderCreateHot,
  limitOrderCreateKc,
  limitOrderCreate,
  cancelOrderKc,
  cancelOrderHot,
  cancelOrderKeyed,
} from "../../api/operations";

import { _t } from "../../i18n";
import KeyOrHot from "../key-or-hot";
import { AnyAction, bindActionCreators, Dispatch } from "redux";
import { connect } from "react-redux";
import { AppState } from "../../store";
import { PrivateKey } from "@hiveio/dhive";

export enum TransactionType {
  None = 0,
  Sell = 2,
  Buy = 1,
  Cancel = 3,
}

interface Props {
  type: TransactionType;
  onConfirm?: Promise<void>;
  onHide: () => void;
  values?: { total: number; amount: number; price: number; available: number };
  global: Global;
  activeUser: ActiveUser;
  addAccount: (arg: any) => void;
  updateActiveUser: (arg: any) => void;
  signingKey: string;
  setSigningKey: (key: string) => void;
  onTransactionSuccess: () => void;
  id?: any;
}

interface State {
  step: 1 | 2 | 3;
  inProgress: boolean;
}

export class BuySellHive extends BaseComponent<any, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      step: 1,
      inProgress: false,
    };
  }

  updateAll = (a: any) => {
    const { addAccount, updateActiveUser, onHide, onTransactionSuccess } =
      this.props;
    // refresh
    addAccount(a);
    // update active
    updateActiveUser(a);
    this.stateSet({ step: 3 });
    this.setState({ inProgress: false });
    onTransactionSuccess();
    onHide();
  };

  promiseCheck = (p: any) => {
    const { onHide } = this.props;
    p && p.then(() => getAccountFull(this.props.activeUser!.username))
      .then((a: any) => this.updateAll(a))
      .catch((err: any) => {
        error(formatError(err));
        this.setState({ inProgress: false });
        onHide();
      });
  };

  sign = (key: PrivateKey) => {
    this.setState({ inProgress: true });
    const { activeUser, Ttype, id } = this.props;
    if (Ttype === TransactionType.Cancel && id) {
      this.promiseCheck(cancelOrderKeyed(activeUser!.username, key, id));
    } else {
      const {
        values: { total, amount },
      } = this.props;
      this.promiseCheck(
        limitOrderCreate(activeUser!.username, key, total, amount, Ttype)
      );
    }
  };

  signHs = () => {
    this.setState({ inProgress: true });
    const { activeUser, Ttype, id } = this.props;
    if (Ttype === TransactionType.Cancel && id) {
      this.promiseCheck(cancelOrderHot(activeUser!.username, id));
    } else {
      const {
        values: { total, amount },
      } = this.props;
      this.promiseCheck(
        limitOrderCreateHot(activeUser!.username, total, amount, Ttype)
      );
    }
  };

  signKc = () => {
    this.setState({ inProgress: true });
    const { activeUser, Ttype, id } = this.props;
    if (Ttype === TransactionType.Cancel && id) {
      this.promiseCheck(cancelOrderKc(activeUser!.username, id));
    } else {
      const {
        values: { total, amount },
      } = this.props;
      this.promiseCheck(
        limitOrderCreateKc(activeUser!.username, total, amount, Ttype)
      );
    }
  };

  render() {
    const { step, inProgress } = this.state;
    const {
      values: { amount, price, total, available } = {
        amount: 0,
        price: 0,
        total: 0,
        available: 0,
      },
      onHide,
      global,
      activeUser,
      signingKey,
      setSigningKey,
      Ttype,
    } = this.props;

    const formHeader1 = (
      <div className="d-flex align-items-center border-bottom pb-3">
        <div className="step-no ml-3">{step}</div>
        <div className="flex-grow-1">
          <div className="main-title">{_t("transfer.confirm-title")}</div>
          <div className="sub-title">{_t("transfer.confirm-sub-title")}</div>
        </div>
      </div>
    );

    if (step === 1) {
      return (
        <div className="mb-3">
          {formHeader1}
          <div className="d-flex justify-content-center">
            {Ttype === TransactionType.Cancel ? (
              <div className="mt-5 w-75 text-center sub-title text-wrap">
                {_t("market.confirm-cancel")}
              </div>
            ) : (
              <div className="mt-5 w-75 text-center sub-title text-wrap">
                {available < total
                  ? _t("market.transaction-low")
                  : TransactionType.Buy
                  ? _t("market.confirm-buy", {amount, price, total, balance: parseFloat(available - total as any).toFixed(3)})
                  : ``}
              </div>
            )}
          </div>
          {available < total ? (
            <></>
          ) : (
            <div className="d-flex justify-content-end mt-5">
              <div className="d-flex">
                <Button variant="secondary" className="mr-3" onClick={onHide}>
                  {_t("g.cancel")}
                </Button>
                <Button
                  onClick={() => this.setState({ step: 2 })}
                  variant={
                    Ttype === TransactionType.Cancel ? "danger" : "primary"
                  }
                >
                  {_t("g.continue")}
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="transaction-form">
          {formHeader1}
          <div className="transaction-form">
            {KeyOrHot({
              global,
              activeUser,
              signingKey,
              setSigningKey,
              inProgress,
              onHot: this.signHs,
              onKey: this.sign,
              onKc: this.signKc,
            })}
            <p className="text-center">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();

                  this.stateSet({ step: 1 });
                }}
              >
                {_t("g.back")}
              </a>
            </p>
          </div>
        </div>
      );
    }

    return <></>;
  }
}

class BuySellHiveDialog extends Component<any> {
  render() {
    const { onHide } = this.props;
    return (
      <Modal
        animation={false}
        show={true}
        centered={true}
        onHide={onHide}
        keyboard={false}
        className="transfer-dialog modal-thin-header"
        size="lg"
      >
        <Modal.Header closeButton={true} />
        <Modal.Body>
          <BuySellHive {...this.props} />
        </Modal.Body>
      </Modal>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  global: state.global,
});

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      addUser,
      setActiveUser,
      updateActiveUser,
      addAccount,
      setSigningKey,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(BuySellHiveDialog);
