import { cleanup, screen, waitFor } from '@testing-library/react'

import { GetIpayIntegrationsListDocument, ProviderTypeEnum } from '~/generated/graphql'

import {
  createPaymentProviderListLoadingMock,
  createPaymentProviderListMock,
  renderIntegrationPage,
} from './integrationTestHelpers'

import IpayIntegrations from '../IpayIntegrations'

jest.mock('~/components/settings/integrations/AddIpayDialog', () => ({
  useAddIpayDialog: () => ({ openAddIpayDialog: jest.fn() }),
}))
jest.mock('~/components/settings/integrations/DeleteIpayIntegrationDialog', () => ({
  useDeleteIpayIntegrationDialog: () => ({
    openDeleteIpayIntegrationDialog: () => null,
  }),
}))

describe('IpayIntegrations', () => {
  afterEach(cleanup)

  describe('GIVEN the page is rendered with data', () => {
    it('THEN renders connection items when data is loaded', async () => {
      await renderIntegrationPage(IpayIntegrations, {
        mocks: createPaymentProviderListMock(
          GetIpayIntegrationsListDocument,
          ProviderTypeEnum.Ipay,
          'IpayProvider',
        ),
      })

      await waitFor(() => {
        expect(screen.getByText('Test Connection')).toBeInTheDocument()
        expect(screen.getByText('test-code')).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN the page is loading', () => {
    it('THEN shows loading skeletons while fetching', async () => {
      const { container } = await renderIntegrationPage(IpayIntegrations, {
        mocks: createPaymentProviderListLoadingMock(
          GetIpayIntegrationsListDocument,
          ProviderTypeEnum.Ipay,
        ),
      })

      expect(screen.queryByText('Test Connection')).not.toBeInTheDocument()
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })
})
