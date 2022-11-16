package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SimpleChaincode struct {
	contractapi.Contract
}

const lottoIndex = "lottoType~lottoDate"

type Asset struct {
	Id           string `json:"id"`
	TxType       string `json:"tx_type"`
	LottoType    string `json:"lotto_type"`
	LottoDate    string `json:"lotto_date"`
	PrivateKey   string `json:"private_key,omitempty"`
	Result       string `json:"result,omitempty"`
	SerialNumber string `json:"serial_number,omitempty"`
	Time         string `json:"time,omitempty"`
	Lotto        string `json:"lotto"`
}

// CreateLottoNumber initializes a new asset in the ledger
func (t *SimpleChaincode) CreateAsset(ctx contractapi.TransactionContextInterface, assetID string, input *Asset) error {
	exists, err := t.AssetExists(ctx, assetID)
	if err != nil {
		return fmt.Errorf("failed to get asset: %v", err)
	}
	if exists {
		return fmt.Errorf("asset already exists: %s", assetID)
	}

	asset := &Asset{
		Id:           assetID,
		TxType:       input.TxType,
		LottoType:    input.LottoType,
		LottoDate:    input.LottoDate,
		PrivateKey:   input.PrivateKey,
		Result:       input.Result,
		SerialNumber: input.SerialNumber,
		Time:         input.Time,
		Lotto:        input.Lotto,
	}

	assetBytes, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(assetID, assetBytes)
	if err != nil {
		return err
	}

	IndexKey, err := ctx.GetStub().CreateCompositeKey(lottoIndex, []string{asset.LottoType, asset.Id})
	if err != nil {
		return err
	}

	value := []byte{0x00}
	return ctx.GetStub().PutState(IndexKey, value)
}

// ReadAsset retrieves an asset from the ledger
func (t *SimpleChaincode) ReadAsset(ctx contractapi.TransactionContextInterface, assetID string) (*Asset, error) {
	assetBytes, err := ctx.GetStub().GetState(assetID)
	if err != nil {
		return nil, fmt.Errorf("failed to get asset %s: %v", assetID, err)
	}
	if assetBytes == nil {
		return nil, fmt.Errorf("asset %s does not exist", assetID)
	}

	var asset Asset
	err = json.Unmarshal(assetBytes, &asset)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

// AssetExists returns true when asset with given ID exists in the ledger.
func (t *SimpleChaincode) AssetExists(ctx contractapi.TransactionContextInterface, assetID string) (bool, error) {
	assetBytes, err := ctx.GetStub().GetState(assetID)
	if err != nil {
		return false, fmt.Errorf("failed to read asset %s from world state. %v", assetID, err)
	}

	return assetBytes != nil, nil
}

// InitLedger creates the initial set of assets in the ledger.
func (t *SimpleChaincode) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{TxType: "txType1", Id: "asset1", LottoType: "lottoType", LottoDate: "lottoDate", PrivateKey: "privateKey", Result: "result", SerialNumber: "serialNumber", Time: "time", Lotto: "lotto"},
	}

	for _, asset := range assets {
		err := t.CreateAsset(ctx, asset.Id, &asset)
		if err != nil {
			return err
		}
	}
	return nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SimpleChaincode{})
	if err != nil {
		log.Panicf("Error creating asset chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting asset chaincode: %v", err)
	}
}
